import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'screenshots');

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
    }
  } catch (err) {
    console.error('Error sending photo:', err.message);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'vi-VN',
  });
  const page = await context.newPage();

  // 1. Login
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'dev@languagelearning.com');
  await page.fill('input[type="password"]', 'DevPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Set opacity to 20% in localStorage so the image is crisp and vivid
  await page.evaluate(() => {
    localStorage.setItem('study_wallpaper_opacity', '20');
  });
  await page.reload();
  await page.waitForTimeout(1000);

  // 2. Capture crisp wallpaper with expanded sidebar
  const crispPath = path.join(outDir, 'wallpaper_crisp_expanded.png');
  await page.screenshot({ path: crispPath });
  console.log('📸 Captured crisp wallpaper:', crispPath);

  // 3. Click collapse sidebar button
  console.log('📐 Collapsing sidebar...');
  const collapseBtn = page.locator('.sidebar-collapse-btn');
  await collapseBtn.click();
  await page.waitForTimeout(600);

  const collapsedPath = path.join(outDir, 'wallpaper_sidebar_collapsed.png');
  await page.screenshot({ path: collapsedPath });
  console.log('📸 Captured collapsed sidebar:', collapsedPath);

  // Send photo to Telegram
  await sendTelegramPhoto(crispPath, '✨ <b>HÌNH NỀN RÕ NÉT 100%</b>\n\nĐã bỏ lớp mờ blur và giảm độ mờ trắng xuống mức nhẹ 20%. Toàn bộ dãy núi tuyết, thung lũng xanh mướt và thác nước đã hiện lên cực kỳ sống động!');
  await sendTelegramPhoto(collapsedPath, '📐 <b>TÍNH NĂNG THU GỌN SIDEBAR</b>\n\nĐã thêm nút thu gọn/mở rộng menu bên trái (chỉ còn 76px với các icon tinh gọn), giúp mở rộng tối đa không gian ngắm cảnh và học tập!');

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
