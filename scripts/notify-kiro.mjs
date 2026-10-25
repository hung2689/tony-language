import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env.telegram.kiro
function getEnvConfig() {
  // Try .env.telegram.kiro first, fallback to .env.telegram
  const envPath = fs.existsSync(path.join(rootDir, '.env.telegram.kiro'))
    ? path.join(rootDir, '.env.telegram.kiro')
    : path.join(rootDir, '.env.telegram');
  let token = '8788174405:AAEzRfKmMWn7TXnWlWzF__V9cYt6R6Jalag';
  let chatId = '6367359223';

  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valParts] = trimmed.split('=');
      const val = valParts.join('=').trim();
      if (key === 'TELEGRAM_BOT_TOKEN') token = val;
      if (key === 'TELEGRAM_CHAT_ID') chatId = val;
    }
  }

  return { token, chatId: String(chatId) };
}

export async function sendTelegramNotification(message) {
  const { token, chatId } = getEnvConfig();

  if (!token || !chatId) {
    console.warn('⚠️ Telegram notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing.');
    return false;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('❌ Failed to send Telegram message:', data.description);
      return false;
    }

    console.log('✅ Telegram notification (Kiro) sent successfully!');
    return true;
  } catch (err) {
    console.error('❌ Error sending Telegram notification (Kiro):', err.message);
    return false;
  }
}

export async function sendTelegramPhoto(filePath, caption = '') {
  const { token, chatId } = getEnvConfig();

  if (!token || !chatId) {
    console.warn('⚠️ Telegram notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing.');
    return false;
  }

  const url = `https://api.telegram.org/bot${token}/sendPhoto`;
  try {
    const fileBytes = fs.readFileSync(filePath);
    const fileBlob = new Blob([fileBytes]);
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', fileBlob, path.basename(filePath));
    if (caption) {
      formData.append('caption', caption);
    }

    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('❌ Failed to send Telegram photo (Kiro):', data.description);
      return false;
    }

    console.log('✅ Telegram photo (Kiro) sent successfully!');
    return true;
  } catch (err) {
    console.error('❌ Error sending Telegram photo (Kiro):', err.message);
    return false;
  }
}

export async function sendTelegramDocument(filePath, caption = '') {
  const { token, chatId } = getEnvConfig();

  if (!token || !chatId) {
    console.warn('⚠️ Telegram notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing.');
    return false;
  }

  const url = `https://api.telegram.org/bot${token}/sendDocument`;
  try {
    const fileBytes = fs.readFileSync(filePath);
    const fileBlob = new Blob([fileBytes]);
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', fileBlob, path.basename(filePath));
    if (caption) {
      formData.append('caption', caption);
    }

    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('❌ Failed to send Telegram document (Kiro):', data.description);
      return false;
    }

    console.log('✅ Telegram document (Kiro) sent successfully!');
    return true;
  } catch (err) {
    console.error('❌ Error sending Telegram document (Kiro):', err.message);
    return false;
  }
}

if (process.argv[1] === __filename) {
  if (process.argv[2] === '--photo') {
    const photoPath = process.argv[3];
    const caption = process.argv.slice(4).join(' ');
    sendTelegramPhoto(photoPath, caption);
  } else if (process.argv[2] === '--doc' || process.argv[2] === '--file') {
    const docPath = process.argv[3];
    const caption = process.argv.slice(4).join(' ');
    sendTelegramDocument(docPath, caption);
  } else {
    const msg = process.argv.slice(2).join(' ') || '⚡ [Kiro AI] Đã hoàn thành tác vụ!';
    sendTelegramNotification(msg);
  }
}
