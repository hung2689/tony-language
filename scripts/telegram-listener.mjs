/**
 * telegram-listener.mjs
 * ─────────────────────────────────────────────────────────────────
 * Kiro ←→ Telegram Remote Controller (Long Polling)
 *
 * Cơ chế:
 *  1. Long-poll Telegram API nhận tin nhắn từ authorized chat.
 *  2. Gửi ACK "⏳ đang xử lý" ngay lập tức.
 *  3. Spawn agy.exe -c -p <prompt> --dangerously-skip-permissions
 *     để AI thực thi nhiệm vụ trong dự án.
 *  4. Gửi toàn bộ output phản hồi về Telegram.
 *
 * Khởi chạy: node scripts/telegram-listener.mjs
 * ─────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const scratchDir = path.join(rootDir, 'scratch');
const inboxPath = path.join(scratchDir, 'telegram_inbox.jsonl');
const offsetPath = path.join(scratchDir, '.telegram_offset');

if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

// ── Load .env.telegram ─────────────────────────────────────────────
function getEnvConfig() {
  const envPath = path.join(rootDir, '.env.telegram');
  let token = process.env.TELEGRAM_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_CHAT_ID;
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key === 'TELEGRAM_BOT_TOKEN') token = val;
      if (key === 'TELEGRAM_CHAT_ID') chatId = val;
    }
  }
  return { token, chatId: chatId ? String(chatId) : null };
}

const { token, chatId: authorizedChatId } = getEnvConfig();

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in .env.telegram');
  process.exit(1);
}

// ── Persist offset ─────────────────────────────────────────────────
let lastUpdateId = 0;
if (fs.existsSync(offsetPath)) {
  try { lastUpdateId = parseInt(fs.readFileSync(offsetPath, 'utf8').trim(), 10) || 0; }
  catch (_) { lastUpdateId = 0; }
}

// ── Telegram API helpers ───────────────────────────────────────────
async function telegramPost(method, body) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    console.error(`[Telegram] ${method} error:`, err.message);
    return { ok: false };
  }
}

async function sendMessage(chatId, text, parseMode = 'HTML') {
  // Telegram max 4096 chars per message
  const maxLen = 4000;
  if (text.length <= maxLen) {
    return telegramPost('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    });
  }
  // Split into chunks
  let i = 0;
  while (i < text.length) {
    await telegramPost('sendMessage', {
      chat_id: chatId,
      text: text.slice(i, i + maxLen),
      parse_mode: parseMode,
      disable_web_page_preview: true,
    });
    i += maxLen;
  }
}

// ── Serial queue ───────────────────────────────────────────────────
const queue = [];
let busy = false;

function enqueue(item) {
  queue.push(item);
  if (!busy) drainQueue();
}

async function drainQueue() {
  if (queue.length === 0) { busy = false; return; }
  busy = true;
  const item = queue.shift();
  try { await processMessage(item); } catch (e) { console.error('[Queue error]', e.message); }
  drainQueue();
}

// ── Core: run agy.exe with the prompt ─────────────────────────────
async function processMessage({ chatId, text, senderName }) {
  console.log(`\n🚀 [Processing] "${text}" from ${senderName}`);

  const prompt =
    `Yêu cầu từ Telegram của ${senderName}: ${text}\n\n` +
    `Hướng dẫn:\n` +
    `- Nếu là câu hỏi/hội thoại: trả lời ngắn gọn, thân thiện bằng tiếng Việt.\n` +
    `- Nếu là yêu cầu thực thi (code, fix bug, test, tính năng...): dùng các công cụ có sẵn để thực hiện trong dự án LanguageLearning, sau đó báo cáo kết quả chi tiết.\n` +
    `- Luôn trả lời bằng tiếng Việt.`;

  return new Promise((resolve) => {
    // Write prompt to a temp file to avoid shell escaping issues with UTF-8
    const tmpPromptPath = path.join(scratchDir, '_tg_prompt.txt');
    fs.writeFileSync(tmpPromptPath, prompt, { encoding: 'utf8' });

    const args = [
      '-c',
      '--print', prompt,
      '--dangerously-skip-permissions',
    ];

    const child = spawn('agy.exe', args, {
      cwd: rootDir,
      shell: false,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
      },
      // Force UTF-8 on Windows stdio
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.stdin.end();

    child.on('close', async (code) => {
      console.log(`\n✅ [Done] Exit code: ${code}`);
      const reply = stdout.trim() || stderr.trim() || '✅ Đã hoàn thành nhiệm vụ.';
      await sendMessage(chatId, reply);
      resolve();
    });

    child.on('error', async (err) => {
      console.error('❌ spawn error:', err.message);
      await sendMessage(chatId, `⚠️ Lỗi khi gọi AI: ${err.message}`);
      resolve();
    });
  });
}

// ── Long Polling ───────────────────────────────────────────────────
async function pollUpdates() {
  const url =
    `https://api.telegram.org/bot${token}/getUpdates` +
    `?offset=${lastUpdateId + 1}&timeout=25&allowed_updates=["message"]`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;
        fs.writeFileSync(offsetPath, String(lastUpdateId), 'utf8');

        const msg = update.message;
        if (!msg) continue;

        const senderChatId = String(msg.chat.id);

        // Security: block unauthorized senders
        if (authorizedChatId && senderChatId !== authorizedChatId) {
          console.warn(`[BLOCKED] Unauthorized chat: ${senderChatId}`);
          continue;
        }

        const text = msg.text?.trim();
        if (!text) continue; // skip stickers/media

        const senderName =
          [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ')
          || msg.from?.username
          || 'User';

        console.log(`📩 [Telegram] ${senderName}: "${text}"`);

        // Log to jsonl
        fs.appendFileSync(
          inboxPath,
          JSON.stringify({
            id: msg.message_id,
            chatId: senderChatId,
            senderName,
            text,
            date: new Date(msg.date * 1000).toISOString(),
          }) + '\n',
          'utf8',
        );

        // Immediate ACK
        await sendMessage(
          senderChatId,
          `⏳ <b>Đang xử lý...</b>\n<i>"${text}"</i>`,
        );

        enqueue({ chatId: senderChatId, text, senderName });
      }
    }
  } catch (err) {
    console.error('[Poll error]', err.message);
    await new Promise(r => setTimeout(r, 3000));
  }

  setImmediate(pollUpdates);
}

// ── Startup ────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     🤖  Kiro Telegram Remote Controller               ║');
  console.log('║     Long Polling — No port forwarding needed          ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`📡 Authorized Chat ID : ${authorizedChatId || '⚠️  ANY (insecure!)'}`);
  console.log(`📥 Log file           : ${inboxPath}`);
  console.log(`💾 Offset file        : ${offsetPath}`);
  console.log('');

  await sendMessage(
    authorizedChatId,
    `🟢 <b>Kiro Remote Controller đã khởi động lại!</b>\n\n` +
    `Tôi đang lắng nghe lệnh của bạn 24/7.\n\n` +
    `📌 <b>Cách dùng:</b>\n` +
    `• Gõ câu hỏi hoặc yêu cầu bất kỳ\n` +
    `• AI sẽ thực thi và phản hồi kết quả ngay tại đây\n\n` +
    `💡 <b>Ví dụ:</b>\n` +
    `<code>fix lỗi login trong AuthService</code>\n` +
    `<code>chạy test và báo cáo kết quả</code>\n\n` +
    `🔒 Chỉ nhận lệnh từ chat ID đã được ủy quyền.`,
  );

  console.log('✅ Welcome message sent.');
  console.log('🔄 Polling started...\n');
  pollUpdates();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
