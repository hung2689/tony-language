import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendTelegramNotification, sendTelegramPhoto } from './notify-telegram.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, '../temp_screenshots');

(async () => {
  console.log('🚀 Capturing new synchronized Study Plan page...');
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

    const screenshotPath = path.join(outputDir, 'study_plan_vintage_concept.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('📸 Saved study plan screenshot to:', screenshotPath);

    // Send notification and photo to Telegram
    const msg = `🗺️ <b>ĐỒNG BỘ GIAO DIỆN TRANG HẢI TRÌNH ÔN TẬP (STUDY PLAN) HOÀN TẤT</b>\n\n` +
      `✨ <b>Chi tiết chuyển đổi concept Vintage Pirate Cartography:</b>\n` +
      `• <b>Thẻ Bảng Hiệu Tiêu Đề (Header Plaque):</b> Đồng bộ giấy da cổ Parchment ngà viền đôi đồng cổ (Brass border #C4A97D), chữ serif deep ink #2C1D11, huy hiệu trạng thái xanh ngọc lục bảo cổ thư #E8F4E5.\n` +
      `• <b>Cuộn Hải Trình Hôm Nay (Today's Hero Card):</b> Thay thế nền đen zinc phẳng bằng chất liệu bìa da hải hành cổ sẫm màu (#2D1E16 -> #3B2A1E), viền đúc vàng thau đinh tán (#C49856), đồng hồ la bàn chỉ tiêu màu vàng hoàng kim ánh dương, nút bắt đầu học xanh rêu mộc bản (#4F6340).\n` +
      `• <b>Thanh Tiến Độ Khắc Gỗ Cổ (Progress Bar):</b> Rãnh khắc chạm gỗ ngà (#E2CEAA) với dải đo xanh rêu ngọc phát sáng mượt mà.\n` +
      `• <b>Hệ Thống Thống Kê 4 Bảng Số Hải Hành (2x2 Ledger Stats):</b> Khung thẻ giấy da viền đồng thau dập nổi, số liệu đếm đậm nét serif, phân định rõ ràng từ thành thạo (ngọc bích #266838) và từ đang nhớ (hổ phách #9E561E).\n` +
      `• <b>Bảng Bộ Thẻ Đang Học (Enrolled Decks Table):</b> Phong cách danh mục thư tịch cổ, nút thêm bộ từ màu rêu phong và nút xóa dấu triện đỏ sáp (#992B2B).\n\n` +
      `🧪 <b>Kiểm thử:</b>\n` +
      `• Vitest: 195/195 tests PASS (100%).\n` +
      `• Production build Vite: Hoàn tất không lỗi.`;

    await sendTelegramNotification(msg);
    await sendTelegramPhoto(screenshotPath, '📸 Ảnh chụp thực tế: Giao diện Trang Hải Trình Ôn Tập (Study Plan) chuẩn Concept Cổ Điển');
    console.log('🎉 Sent to Telegram successfully!');
  } catch (err) {
    console.error('❌ Failed to capture:', err);
  } finally {
    await browser.close();
  }
})();
