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
  console.log('🚀 Launching browser...');
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

  // Set opacity to 25% for crisp, vivid background
  await page.evaluate(() => {
    localStorage.setItem('study_wallpaper_opacity', '25');
  });
  await page.reload();
  await page.waitForTimeout(1000);

  // 2. Capture crisp wallpaper with expanded sidebar
  const expandedPath = path.join(outDir, 'wallpaper_crisp_expanded_new.png');
  await page.screenshot({ path: expandedPath });
  console.log('📸 Captured expanded view:', expandedPath);

  // 3. Click sidebar collapse toggle in topbar
  console.log('📐 Clicking collapse toggle in topbar...');
  const toggleBtn = page.locator('.topbar-sidebar-toggle-btn');
  await toggleBtn.click();
  await page.waitForTimeout(600);

  // 4. Capture collapsed sidebar view
  const collapsedPath = path.join(outDir, 'wallpaper_crisp_collapsed_new.png');
  await page.screenshot({ path: collapsedPath });
  console.log('📸 Captured collapsed view:', collapsedPath);

  // Send photo to Telegram
  await sendTelegramPhoto(expandedPath, '🏔️ <b>HÌNH NỀN RÕ NÉT & SỐNG ĐỘNG!</b>\n\n- Đã bỏ hoàn toàn hiệu ứng mờ (blur).\n- Đặt độ mờ lớp phủ màu trắng nhẹ nhàng chỉ 25% (nhìn rõ toàn bộ núi tuyết và thung lũng xanh).');
  await sendTelegramPhoto(collapsedPath, '📐 <b>SIDEBAR ĐÃ CÓ THỂ THU GỌN!</b>\n\n- Nhấn nút ở góc trái thanh Topbar hoặc đầu Sidebar để thu gọn lại còn 76px dạng icon.\n- Mở rộng tối đa không gian màn hình ngắm cảnh và tập trung học!');

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
