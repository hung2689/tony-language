import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function getEnvConfig() {
  const envPath = path.join(rootDir, '.env.telegram');
  let token = process.env.TELEGRAM_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_CHAT_ID;

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

  return { token, chatId };
}

async function sendTelegramPhoto(photoPath, caption) {
  const { token, chatId } = getEnvConfig();
  if (!token || !chatId) return;

  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', caption);
  const fileBlob = new Blob([fs.readFileSync(photoPath)], { type: 'image/png' });
  formData.append('photo', fileBlob, path.basename(photoPath));

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (data.ok) {
      console.log('✅ Photo sent to Telegram successfully!');
    } else {
      console.error('❌ Failed to send photo:', data.description);
    }
  } catch (err) {
    console.error('Error sending photo:', err.message);
  }
}

async function run() {
  console.log('🚀 Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'vi-VN',
  });
  const page = await context.newPage();

  // 1. Login
  console.log('🔑 Logging in...');
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'dev@languagelearning.com');
  await page.fill('input[type="password"]', 'DevPassword123!');
  await page.click('button[type="submit"]');

  // Wait for library page
  await page.waitForURL('http://localhost:5173/', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // 2. Click on the first deck card
  console.log('📚 Navigating to deck detail...');
  const deckCard = page.locator('.monochrome-deck-card').first();
  await deckCard.waitFor({ state: 'visible', timeout: 10000 });
  await deckCard.click();

  // Wait for deck page & flashcard to render
  await page.waitForURL('**/decks/**', { timeout: 10000 });
  await page.waitForSelector('.flashcard-card-box', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // 3. Capture screenshot
  const screenshotPath = path.join(outDir, 'telegram_requested_deck.png');
  await page.screenshot({ path: screenshotPath });
  console.log('📸 Screenshot captured at:', screenshotPath);

  // 4. Send photo to Telegram
  await sendTelegramPhoto(screenshotPath, '📸 <b>Ảnh chụp màn hình bộ từ vựng (Deck) theo yêu cầu của bạn qua Telegram!</b>\n\nỨng dụng đang hiển thị chế độ Flashcard tương tác.');

  await browser.close();
}

run().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
