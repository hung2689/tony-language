import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendTelegramNotification, sendTelegramPhoto } from './notify-telegram.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, '../temp_screenshots');

(async () => {
  console.log('🚀 Capturing updated Study Plan page (parchment background, dock removed)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('#login-email', 'demo_srs@example.com');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto('http://localhost:5173/study-plan', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const screenshotPath = path.join(outputDir, 'study_plan_no_dock_parchment.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('📸 Saved screenshot to:', screenshotPath);

    // Send notification and photo to Telegram
    const msg = `🗺️ <b>CẬP NHẬT TRANG HẢI TRÌNH ÔN TẬP THEO YÊU CẦU</b>\n\n` +
      `✨ <b>Chi tiết thay đổi:</b>\n` +
      `1. <b>Thay Nền Wallpaper:</b> Loại bỏ hoàn toàn hình nền ảnh tuyết núi/wallpaper hiện đại phía sau, thay bằng <b>Nền Giấy Da Cổ Điển (Parchment Texture Canvas)</b> đồng bộ 100% với Thư Viện và concept Hải Trình Cổ Điển.\n` +
      `2. <b>Ẩn Thanh Dock Ở Dưới:</b> Đã ẩn hoàn toàn thanh dock tròn dưới đáy màn hình, giải phóng tối đa không gian hiển thị cho các thẻ số liệu và bảng bộ từ.\n` +
      `3. <b>Bổ Sung Nút Điều Hướng Cổ Điển:</b> Thêm phím <code>Thư viện</code> viền đồng cổ ngay trên thanh tiêu đề để người dùng quay lại thuận tiện.\n\n` +
      `Dưới đây là ảnh chụp thực tế màn hình sau khi cập nhật:`;

    await sendTelegramNotification(msg);
    await sendTelegramPhoto(screenshotPath, '📸 Ảnh chụp thực tế: Trang Hải Trình Ôn Tập với nền Giấy Da Cổ và đã ẩn thanh Dock phía dưới');
    console.log('🎉 Sent to Telegram successfully!');
  } catch (err) {
    console.error('❌ Failed to capture & send:', err);
  } finally {
    await browser.close();
  }
})();
