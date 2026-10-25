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
    viewport: { width: 1440, height: 900 },
    locale: 'vi-VN',
  });
  const page = await context.newPage();

  // 1. Login
  console.log('🔑 Logging in...');
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'dev@languagelearning.com');
  await page.fill('input[type="password"]', 'DevPassword123!');
  await page.click('button[type="submit"]');

  await page.waitForURL('http://localhost:5173/', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // 2. Capture Library with default wallpaper (Lauterbrunnen Valley)
  const libPath = path.join(outDir, 'wallpaper_library_preview.png');
  await page.screenshot({ path: libPath });
  console.log('📸 Captured library with wallpaper:', libPath);

  // 3. Open Wallpaper modal from sidebar
  console.log('🖼️ Opening Wallpaper modal...');
  const wpBtn = page.locator('.sidebar-nav-button').filter({ hasText: 'Hình nền' });
  await wpBtn.click();
  await page.waitForSelector('.wallpaper-modal-content', { timeout: 6000 });
  await page.waitForTimeout(600);

  const modalPath = path.join(outDir, 'wallpaper_switcher_modal.png');
  await page.screenshot({ path: modalPath });
  console.log('📸 Captured wallpaper modal:', modalPath);

  // Close modal
  await page.click('button:has-text("Hoàn tất")');
  await page.waitForTimeout(400);

  // 4. Navigate into Deck page to test Flashcard with wallpaper & glassmorphism
  console.log('📚 Navigating to deck detail...');
  const deckCard = page.locator('.monochrome-deck-card').first();
  await deckCard.waitFor({ state: 'visible', timeout: 10000 });
  await deckCard.click();

  await page.waitForURL('**/decks/**', { timeout: 10000 });
  await page.waitForSelector('.flashcard-card-box', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const deckPath = path.join(outDir, 'wallpaper_deck_flashcard.png');
  await page.screenshot({ path: deckPath });
  console.log('📸 Captured deck flashcard with wallpaper:', deckPath);

  // Send photo to Telegram
  await sendTelegramPhoto(libPath, '🏔️ <b>GIAO DIỆN MỚI: Thung lũng Lauterbrunnen Thụy Sĩ</b>\n\nĐã tích hợp hình nền phong cảnh kết hợp Monochrome Glassmorphism cao cấp cho trang Thư viện!');
  await sendTelegramPhoto(deckPath, '📖 <b>Trang học Flashcard với hình nền tĩnh lặng</b>\n\nNền thẻ từ giữ vững độ tương phản cao, phông chữ đen sắc nét trên lớp kính mờ.');

  await browser.close();
}

run().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
