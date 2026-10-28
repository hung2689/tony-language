import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sendTelegramPhoto } from './notify-telegram.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  console.log('🚀 Khởi động Playwright để chụp lại màn hình Cài đặt đã tinh chỉnh...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 860 },
    locale: 'vi-VN',
  });
  const page = await context.newPage();

  try {
    // 1. Đăng nhập
    console.log('🔑 Đang đăng nhập...');
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'dev@languagelearning.com');
    await page.fill('input[type="password"]', 'DevPassword123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('http://localhost:5173/**', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Đi vào Learn Mode deck 11
    await page.goto('http://localhost:5173/decks/11/learn');
    await page.waitForSelector('.vintage-setting-card', { timeout: 15000 });
    await page.waitForTimeout(1500);

    // Chụp ảnh Setup mới
    const setupPath = path.join(outDir, '01_learn_setup_fixed_seamless.png');
    await page.screenshot({ path: setupPath, fullPage: true });
    console.log(`📸 Đã chụp màn hình Setup mới: ${setupPath}`);

    // Gửi qua Telegram
    console.log('📤 Đang gửi ảnh cập nhật qua Telegram...');
    await sendTelegramPhoto(
      setupPath,
      '✨ <b>[Antigravity AI] GIAO DIỆN CÀI ĐẶT HẢI TRÌNH ĐÃ ĐƯỢC TINH CHỈNH</b>\n' +
      '• <b>Bỏ khung viền phía sau:</b> Đã ẩn hoàn toàn khung đỡ và la bàn cắt thừa phía sau; 4 thẻ cài đặt giờ nằm hài hòa trực tiếp trên nền hải đồ cổ.\n' +
      '• <b>Nền giấy liền lạc:</b> Thay nền lặp gạch (repeat) bằng dải màu giấy da cổ mịn màng (seamless parchment gradient), loại bỏ hoàn toàn hiện tượng chắp vá.'
    );

    console.log('🎉 Hoàn tất gửi ảnh cập nhật qua Telegram!');
  } catch (err) {
    console.error('❌ Lỗi:', err);
  } finally {
    await browser.close();
  }
}

capture();
