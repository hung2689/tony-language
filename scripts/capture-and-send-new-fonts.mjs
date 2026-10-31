import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sendTelegramNotification, sendTelegramPhoto } from './notify-telegram.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, '../temp_screenshots');

(async () => {
  console.log('🚀 Capturing pages with Mẫu 1 (Lora + Be Vietnam Pro)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('#login-email', 'demo_srs@example.com');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 1. Capture Analytics with new font
    await page.goto('http://localhost:5173/analytics', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    const analyticsShot = path.join(outputDir, 'analytics_font_model_1.png');
    await page.screenshot({ path: analyticsShot, fullPage: true });
    console.log('📸 Saved analytics screenshot with Mẫu 1 to:', analyticsShot);

    // 2. Capture Study Plan with new font
    await page.goto('http://localhost:5173/study-plan', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    const studyPlanShot = path.join(outputDir, 'study_plan_font_model_1.png');
    await page.screenshot({ path: studyPlanShot, fullPage: false });
    console.log('📸 Saved study plan screenshot with Mẫu 1 to:', studyPlanShot);

    // Send notifications and photos to Telegram
    const msg = `✨ <b>ĐÃ CẬP NHẬT TOÀN BỘ PHÔNG CHỮ DỰ ÁN THEO MẪU 1 THÀNH CÔNG!</b>\n\n` +
      `📌 <b>Bộ phông đã áp dụng:</b>\n` +
      `• <b>Tiêu đề & Huy hiệu:</b> <code>Lora</code> (Serif cổ điển sang trọng, nét thanh nét đậm chuẩn mực, không bao giờ lỗi dấu tiếng Việt).\n` +
      `• <b>Thân chữ, Nhãn, Bảng biểu:</b> <code>Be Vietnam Pro</code> (Công thái học tối ưu riêng cho Tiếng Việt, nét tròn trịa, êm mắt, rõ ràng từng chi tiết).\n\n` +
      `🛠️ <b>Các tệp tin cốt lõi đã đồng bộ:</b>\n` +
      `• <code>frontend/index.html</code>: Nạp Google Fonts chuẩn Unicode tiếng Việt.\n` +
      `• <code>frontend/src/index.css</code>: Cập nhật biến toàn cục <code>--font-family</code> & <code>--font-serif</code>.\n` +
      `• <code>Analytics.css</code> & <code>StudyPlan.css</code>: Loại bỏ 100% phông Cinzel / Times New Roman, chuyển sang Lora & Be Vietnam Pro.\n` +
      `• <code>Profile.css</code> & <code>RpgLibraryWorkspace.css</code>: Đồng bộ tiêu đề và nội dung theo Mẫu 1.\n\n` +
      `🧪 <b>Kiểm thử & Build:</b>\n` +
      `• Vitest: 195/195 tests PASS (100%).\n` +
      `• Vite production build: Hoàn tất không lỗi.`;

    await sendTelegramNotification(msg);
    await sendTelegramPhoto(analyticsShot, '📸 Trang Lịch Sử Học Tập (Analytics) sau khi đổi sang Mẫu 1 (Lora + Be Vietnam Pro)');
    await sendTelegramPhoto(studyPlanShot, '📸 Trang Hải Trình Ôn Tập (Study Plan) sau khi đổi sang Mẫu 1 (Lora + Be Vietnam Pro)');
    console.log('🎉 Sent updated font screenshots to Telegram successfully!');
  } catch (err) {
    console.error('❌ Error capturing updated pages:', err);
  } finally {
    await browser.close();
  }
})();
