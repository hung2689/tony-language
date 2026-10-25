/**
 * telegram-listener-kiro.mjs
 * ─────────────────────────────────────────────────────────────────
 * Kiro AI ←→ Telegram Remote Controller (Long Polling)
 * Hoàn toàn tách biệt với Antigravity bot.
 *
 * Cơ chế:
 *  1. Long-poll Telegram API (bot token Kiro riêng).
 *  2. Gửi ACK "⏳ đang xử lý" ngay lập tức.
 *  3. Ghi entry vào scratch/kiro_inbox.json (status: PENDING).
 *  4. Spawn agy.exe với prompt → AI xử lý nhiệm vụ trong dự án.
 *  5. Reply qua notify-kiro.mjs với tiền tố [Kiro AI].
 *  6. Cập nhật status: DONE trong kiro_inbox.json.
 *
 * Khởi chạy: node scripts/telegram-listener-kiro.mjs
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
const kiroInboxPath = path.join(scratchDir, 'kiro_inbox.json');
const inboxLogPath = path.join(scratchDir, 'kiro_telegram_inbox.jsonl');
const offsetPath = path.join(scratchDir, '.kiro_telegram_offset');

if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

// ── Load .env.telegram (Kiro bot token) ───────────────────────────
function getEnvConfig() {
  // Try .env.telegram.kiro first, fallback to .env.telegram
  const envPath = fs.existsSync(path.join(rootDir, '.env.telegram.kiro'))
    ? path.join(rootDir, '.env.telegram.kiro')
    : path.join(rootDir, '.env.telegram');

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
  console.error('❌ TELEGRAM_BOT_TOKEN not found');
  process.exit(1);
}

// ── Persist offset ─────────────────────────────────────────────────
let lastUpdateId = 0;
if (fs.existsSync(offsetPath)) {
  try { lastUpdateId = parseInt(fs.readFileSync(offsetPath, 'utf8').trim(), 10) || 0; }
  catch (_) { lastUpdateId = 0; }
}

// ── Telegram API ───────────────────────────────────────────────────
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

async function sendMessage(chatId, text) {
  const maxLen = 4000;
  const chunks = text.length <= maxLen
    ? [text]
    : Array.from({ length: Math.ceil(text.length / maxLen) }, (_, i) =>
        text.slice(i * maxLen, (i + 1) * maxLen));
  for (const chunk of chunks) {
    await telegramPost('sendMessage', {
      chat_id: chatId,
      text: chunk,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  }
}

// ── kiro_inbox.json helpers ────────────────────────────────────────
function readKiroInbox() {
  if (!fs.existsSync(kiroInboxPath)) return [];
  try { return JSON.parse(fs.readFileSync(kiroInboxPath, 'utf8')); }
  catch (_) { return []; }
}

function writeKiroInbox(entries) {
  fs.writeFileSync(kiroInboxPath, JSON.stringify(entries, null, 2), 'utf8');
}

function addPendingEntry(entry) {
  const entries = readKiroInbox();
  // Remove old DONE entries (keep max 20)
  const active = entries.filter(e => e.status !== 'DONE').slice(-20);
  active.push({ ...entry, status: 'PENDING' });
  writeKiroInbox(active);
  return entry.id;
}

function markEntryDone(messageId) {
  const entries = readKiroInbox();
  const updated = entries.map(e =>
    e.id === messageId ? { ...e, status: 'DONE', completedAt: new Date().toISOString() } : e
  );
  writeKiroInbox(updated);
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

// ── Core: process message via agy.exe ─────────────────────────────
async function processMessage({ chatId, text, senderName, messageId }) {
  console.log(`\n🚀 [Kiro Processing] "${text}" from ${senderName}`);

  const prompt =
    `Bạn là Kiro AI Assistant chuyên trách lập trình trong dự án LanguageLearning.\n` +
    `Yêu cầu từ ${senderName} qua Telegram: ${text}\n\n` +
    `Quy tắc:\n` +
    `- Luôn trả lời bằng tiếng Việt.\n` +
    `- Với câu hỏi/hội thoại: trả lời ngắn gọn, thân thiện.\n` +
    `- Với yêu cầu kỹ thuật (code, fix bug, test...): dùng công cụ sẵn có để thực thi trong dự án rồi báo cáo kết quả.\n` +
    `- KHÔNG thêm tiền tố [Kiro AI] vào câu trả lời (listener sẽ tự thêm).`;

  return new Promise((resolve) => {
    const child = spawn('agy.exe', [
      '-c', '--print', prompt, '--dangerously-skip-permissions',
    ], {
      cwd: rootDir,
      shell: false,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; process.stdout.write(chunk); });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.stdin.end();

    child.on('close', async (code) => {
      console.log(`\n✅ [Kiro Done] Exit: ${code}`);
      const raw = stdout.trim() || stderr.trim() || 'Đã hoàn thành nhiệm vụ.';
      const reply = `🤖 <b>[Kiro AI]</b>\n\n${raw}`;
      await sendMessage(chatId, reply);
      markEntryDone(messageId);
      resolve();
    });

    child.on('error', async (err) => {
      console.error('❌ spawn error:', err.message);
      await sendMessage(chatId, `🤖 <b>[Kiro AI]</b>\n\n⚠️ Lỗi: ${err.message}`);
      markEntryDone(messageId);
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
        if (authorizedChatId && senderChatId !== authorizedChatId) {
          console.warn(`[BLOCKED] Unauthorized: ${senderChatId}`);
          continue;
        }

        const text = msg.text?.trim();
        if (!text) continue;

        const senderName =
          [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ')
          || msg.from?.username || 'User';

        console.log(`📩 [Kiro Telegram] ${senderName}: "${text}"`);

        // Log
        fs.appendFileSync(inboxLogPath,
          JSON.stringify({ id: msg.message_id, chatId: senderChatId, senderName, text, date: new Date(msg.date * 1000).toISOString() }) + '\n',
          'utf8');

        // Write to kiro_inbox.json
        addPendingEntry({
          id: msg.message_id,
          chatId: senderChatId,
          senderName,
          text,
          date: new Date(msg.date * 1000).toISOString(),
        });

        // ACK
        await sendMessage(senderChatId,
          `🤖 <b>[Kiro AI]</b> đang xử lý yêu cầu của bạn...\n\n` +
          `⏳ <i>"${text}"</i>`);

        enqueue({ chatId: senderChatId, text, senderName, messageId: msg.message_id });
      }
    }
  } catch (err) {
    console.error('[Kiro Poll error]', err.message);
    await new Promise(r => setTimeout(r, 3000));
  }

  setImmediate(pollUpdates);
}

// ── Startup ────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   🤖  KIRO AI — Telegram Remote Controller            ║');
  console.log('║   Tách biệt với Antigravity bot                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`📡 Bot Token  : ${token.slice(0, 10)}...`);
  console.log(`👤 Chat ID    : ${authorizedChatId}`);
  console.log(`📥 Inbox      : ${kiroInboxPath}`);
  console.log(`💾 Offset     : ${offsetPath}`);
  console.log('');

  await sendMessage(authorizedChatId,
    `🤖 <b>[Kiro AI]</b> đã khởi động thành công!\n\n` +
    `✅ Tách biệt hoàn toàn với Antigravity bot.\n` +
    `📡 Đang lắng nghe lệnh 24/7 từ chat này.\n\n` +
    `💬 Nhắn bất kỳ yêu cầu nào — Kiro sẽ thực thi và phản hồi ngay!`);

  console.log('✅ Startup message sent.\n🔄 Polling...\n');
  pollUpdates();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
