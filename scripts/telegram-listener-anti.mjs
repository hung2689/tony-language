/**
 * telegram-listener-anti.mjs
 * ─────────────────────────────────────────────────────────────────
 * Antigravity Dedicated Telegram Bot Listener (@tony_dev_notify_bot)
 *
 * Chỉ lắng nghe trên Bot của Antigravity (Token: 8737396410:AAGztH3rSJZbLbOlnqAbNhFj0SGNCPAI6w4)
 * Thực thi lệnh bằng agy CLI và gửi phản hồi lại Bot của Antigravity.
 * Hoàn toàn độc lập với Kiro.
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
const offsetPath = path.join(scratchDir, '.telegram_offset_anti');
const logPath = path.join(scratchDir, 'anti_telegram_inbox.jsonl');

if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

process.on('uncaughtException', (err) => {
  console.error('[Anti Listener] Uncaught Exception:', err.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Anti Listener] Unhandled Rejection:', reason);
});

function getEnvConfig() {
  const envPath = fs.existsSync(path.join(rootDir, '.env.telegram.anti'))
    ? path.join(rootDir, '.env.telegram.anti')
    : path.join(rootDir, '.env.telegram');

  let token = '8737396410:AAGztH3rSJZbLbOlnqAbNhFj0SGNCPAI6w4';
  let chatId = '6367359223';

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

let lastUpdateId = 0;
if (fs.existsSync(offsetPath)) {
  try {
    lastUpdateId = parseInt(fs.readFileSync(offsetPath, 'utf8').trim(), 10) || 0;
  } catch (_) {
    lastUpdateId = 0;
  }
}

async function telegramRequest(method, body) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    console.error(`[Anti Bot] ${method} failed:`, err.message);
    return { ok: false };
  }
}

async function sendMessage(chatId, text, parseMode = 'HTML') {
  const chunks = chunkText(text, 4000);
  for (const chunk of chunks) {
    const res = await telegramRequest('sendMessage', {
      chat_id: chatId,
      text: chunk,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    });
    if (!res || !res.ok) {
      // Fallback without parse_mode if HTML entity parse error occurs
      await telegramRequest('sendMessage', {
        chat_id: chatId,
        text: chunk,
        disable_web_page_preview: true,
      });
    }
  }
}

function chunkText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + maxLen));
    i += maxLen;
  }
  return chunks;
}

let isAgyRunning = false;
const messageQueue = [];

function executeNextTask() {
  if (isAgyRunning || messageQueue.length === 0) return;

  isAgyRunning = true;
  const { senderChatId, text, senderName } = messageQueue.shift();

  console.log(`\n🤖 [Antigravity AI Working] Processing: "${text}" from ${senderName}...`);

  const fullPrompt = `Yêu cầu từ Telegram của ${senderName}: ${text}

Hướng dẫn:
- Bạn là Antigravity (Anti) AI Assistant trên IDE.
- Nếu là câu hỏi, hãy trả lời tự nhiên, thân thiện và súc tích bằng tiếng Việt.
- Nếu là yêu cầu code, sửa lỗi, chạy test hay làm tính năng trong dự án LanguageLearning, hãy dùng các công cụ có sẵn để thực hiện code, sửa file, kiểm thử và thông báo kết quả chi tiết lại cho người dùng.
- Khi phản hồi, luôn ghi rõ "[Antigravity AI]".`;

  const agyProcess = spawn('agy.exe', ['-c', '-p', fullPrompt, '--dangerously-skip-permissions'], {
    cwd: rootDir,
    shell: false,
    env: { ...process.env, DB_PORT: '5433' },
  });

  let outputBuffer = '';
  let errorBuffer = '';

  agyProcess.stdout.on('data', (data) => {
    const chunk = data.toString('utf8');
    outputBuffer += chunk;
    process.stdout.write(chunk);
  });

  agyProcess.stderr.on('data', (data) => {
    const chunk = data.toString('utf8');
    errorBuffer += chunk;
    process.stderr.write(chunk);
  });

  agyProcess.on('error', async (err) => {
    console.error(`\n❌ [Antigravity AI Process Error]:`, err.message);
    isAgyRunning = false;
    const formattedReply = `🤖 <b>[Antigravity AI]</b>\n\n⚠️ Đã xảy ra lỗi khi khởi chạy tác vụ: ${err.message}`;
    await sendMessage(senderChatId, formattedReply);
    executeNextTask();
  });

  agyProcess.on('close', async (code) => {
    console.log(`\n🏁 [Antigravity AI Finished] Process exited with code ${code}`);
    isAgyRunning = false;

    let cleanReply = outputBuffer.trim();
    if (!cleanReply && errorBuffer) {
      cleanReply = `⚠️ Có lỗi khi thực thi:\n${errorBuffer.trim()}`;
    } else if (!cleanReply) {
      cleanReply = '✅ Antigravity đã hoàn thành tác vụ nhưng không có dữ liệu trả về.';
    }

    const formattedReply = `🤖 <b>[Antigravity AI]</b>\n\n${cleanReply}`;
    await sendMessage(senderChatId, formattedReply);

    executeNextTask();
  });
}

async function handleMessage({ chatId, text, senderName, messageId, date }) {
  console.log(`\n📩 [Anti Received] ${senderName}: "${text}"`);

  await sendMessage(
    chatId,
    `🤖 <b>[Antigravity AI] Đang xử lý yêu cầu của bạn...</b>\n\n` +
      `📝 <i>"${text}"</i>\n\n` +
      `Antigravity đang xử lý và sẽ phản hồi ngay khi xong.`
  );

  const logEntry = { id: messageId, chatId, senderName, text, date, status: 'QUEUED' };
  fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n', 'utf8');

  messageQueue.push({ senderChatId: chatId, text, senderName });
  executeNextTask();
}

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
        const text = msg.text?.trim() || '';

        if (authorizedChatId && senderChatId !== authorizedChatId) {
          console.warn(`[Anti Security] Blocked message from unauthorized chat: ${senderChatId}`);
          continue;
        }

        if (text) {
          await handleMessage({
            chatId: senderChatId,
            text,
            senderName: msg.from?.first_name || 'User',
            messageId: msg.message_id,
            date: new Date(msg.date * 1000).toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.error('[Anti Poll Error]', err.message);
    await new Promise((r) => setTimeout(r, 4000));
  }

  setImmediate(pollUpdates);
}

console.log('🤖 Antigravity Telegram Dedicated Listener started!');
console.log(`📡 Listening on Bot Antigravity for Chat ID: ${authorizedChatId || 'any'}...`);
pollUpdates();
