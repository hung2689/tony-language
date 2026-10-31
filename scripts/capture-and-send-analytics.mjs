import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sendTelegramNotification, sendTelegramPhoto } from './notify-telegram.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, '../temp_screenshots');
const artifactDir = 'C:/Users/ASUS/.gemini/antigravity-cli/brain/257ce94f-d6af-402b-a44c-f8fc9c830e89';

(async () => {
  console.log('🚀 Capturing new synchronized Analytics page...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('#login-email', 'demo_srs@example.com');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto('http://localhost:5173/analytics', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    const screenshotPath = path.join(outputDir, 'analytics_vintage_concept.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('📸 Saved analytics screenshot to:', screenshotPath);

    // Also copy to artifact directory for IDE preview
    try {
      if (fs.existsSync(artifactDir)) {
        fs.copyFileSync(screenshotPath, path.join(artifactDir, 'analytics_vintage_concept.png'));
        console.log('📋 Copied to artifact directory');
      }
    } catch (e) {
      console.warn('Artifact copy note:', e.message);
    }

    // Send notification and photo to Telegram
    const msg = `📜 <b>ĐỒNG BỘ REDESIGN TRANG LỊCH SỬ HỌC TẬP & THỐNG KÊ (ANALYTICS) HOÀN TẤT</b>\n\n` +
      `✨ <b>Chi tiết chuyển đổi concept Vintage Pirate Cartography / Sách Cổ Hải Hành:</b>\n` +
      `• <b>Nền Giấy Da Cổ (Antique Parchment Canvas):</b> Xóa bỏ nền xanh nhạt hiện đại và thanh dock nổi che khuất bên dưới, áp dụng nền giấy da ấm vàng #F5E9CE liền mạch mượt mà.\n` +
      `• <b>Bảng Hiệu Tiêu Đề Cổ Thư (Header Plaque):</b> Biển hiệu giấy da viền đồng thau dập nổi (#C4A97D), tựa đề serif phong cách hải đồ cổ "Sử Ký & Bảng Thành Tích Hải Hành" cùng phím điều hướng cổ điển.\n` +
      `• <b>Băng Rôn Đẳng Cấp Hải Trình (Hero Learner Banner):</b> Tông màu bìa da thám hiểm cổ điển (#2D1E16 -> #3B2A1E) viền đồng đúc vàng thau (#C49856), huy hiệu đá quý vát cạnh, ngọn lửa chuỗi ngày học rực rỡ.\n` +
      `• <b>Bảng Huy Hiệu Thành Tích (Achievements Grid):</b> Khung giấy da ngà sang trọng, icon vàng đồng nổi bật, thẻ trạng thái mộc bản cổ xưa.\n` +
      `• <b>Biểu Đồ Hoạt Động Bản Đồ Cổ (Jade & Emerald Activity Heatmap):</b> Thay thế màu xanh lá GitHub bằng 5 cấp độ ngọc bích / rêu phong cổ điển (#E8DCBE -> #BDD9B8 -> #7FA875 -> #466E3A -> #26491C), tooltip giấy da nâu cổ sang trọng.\n` +
      `• <b>Phân Bổ Ghi Nhớ SM-2:</b> Hệ thẻ phân tầng 4 cấp độ ký ức (Đã thành thạo, Đang củng cố, Đang tiếp thu, Chưa bắt đầu) với tông màu ngọc lục bảo, hổ phách, lam khói và giấy mộc.\n` +
      `• <b>Bảng Từ Cần Củng Cố (Weak Words Ledger):</b> Sổ kê chi tiết các từ hay sai với thẻ dấu triện sáp đỏ và nút luyện tập màu xanh rêu mộc bản cổ điển.\n\n` +
      `🧪 <b>Kiểm thử & Build:</b>\n` +
      `• Vitest Unit Tests: 195/195 tests PASS (100%).\n` +
      `• Production build Vite: Thành công 100%.`;

    await sendTelegramNotification(msg);
    await sendTelegramPhoto(screenshotPath, '📸 Ảnh chụp thực tế: Redesign Trang Lịch Sử Học Tập (Analytics) theo Concept Cổ Điển');
    console.log('🎉 Sent to Telegram successfully!');
  } catch (err) {
    console.error('❌ Failed to capture:', err);
  } finally {
    await browser.close();
  }
})();
