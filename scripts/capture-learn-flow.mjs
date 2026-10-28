import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sendTelegramPhoto, sendTelegramNotification } from './notify-telegram.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  console.log('🚀 Khởi động Playwright để chụp luồng Chế độ Học (Learn Mode)...');
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
    console.log('✅ Đã đăng nhập. Đi thẳng vào Chế độ Học của Deck 11...');

    await page.goto('http://localhost:5173/decks/11/learn');
    await page.waitForSelector('.vintage-setup-parchment-panel', { timeout: 15000 });
    await page.waitForTimeout(1200);

    // Chụp Màn hình 1: Cài đặt học tập (Learn Setup)
    const setupPath = path.join(outDir, '01_learn_setup_vintage.png');
    await page.screenshot({ path: setupPath, fullPage: true });
    console.log(`📸 Đã chụp Màn hình Cài đặt: ${setupPath}`);

    // Chọn số câu: 3 câu để test nhanh
    const customRadio = page.locator('input[value="custom"]');
    if (await customRadio.count() > 0) {
      await customRadio.check();
      const numInput = page.locator('.vintage-custom-number-input');
      await numInput.fill('3');
      await page.waitForTimeout(400);
    }

    // 2. Bắt đầu phiên học
    console.log('⚔ Bấm bắt đầu hải trình...');
    await page.click('.vintage-launch-voyage-btn');
    await page.waitForSelector('.vintage-question-scroll-wrapper', { timeout: 10000 });
    await page.waitForTimeout(1200);

    // Chụp Màn hình 2: Câu hỏi (Learn Question)
    const questionPath = path.join(outDir, '02_learn_question_vintage.png');
    await page.screenshot({ path: questionPath, fullPage: true });
    console.log(`📸 Đã chụp Màn hình Câu hỏi: ${questionPath}`);

    // 3. Trả lời thử để xem Feedback
    console.log('📝 Nhập câu trả lời khảo nghiệm...');
    const input = page.locator('.vintage-answer-input');
    await input.fill('adventure');
    await page.click('.vintage-submit-btn');

    await page.waitForSelector('.vintage-feedback-seal-banner', { timeout: 10000 });
    await page.waitForTimeout(1200);

    // Chụp Màn hình 3: Phản hồi Đúng/Sai (Learn Feedback)
    const feedbackPath = path.join(outDir, '03_learn_feedback_vintage.png');
    await page.screenshot({ path: feedbackPath, fullPage: true });
    console.log(`📸 Đã chụp Màn hình Phản hồi: ${feedbackPath}`);

    // 4. Tiếp tục hoàn thành các câu còn lại để đến màn Kết quả
    let attempts = 0;
    while (attempts < 12) {
      attempts++;
      console.log(`Tiến trình vòng lặp câu hỏi/kết quả (bước ${attempts})...`);

      const isResults = await page.locator('.vintage-results-parchment-panel').count() > 0;
      if (isResults) {
        console.log('🎉 Đã đạt tới màn hình Kết quả!');
        break;
      }

      const isFeedback = await page.locator('.vintage-continue-btn').count() > 0;
      if (isFeedback) {
        // Nếu có nút override (đáp án sai), click override để chuyển thành đúng
        const overrideBtn = page.locator('.vintage-override-link-btn');
        if (await overrideBtn.count() > 0) {
          console.log('Bấm chấp nhận đáp án (override)...');
          await overrideBtn.click();
          await page.waitForTimeout(400);
        }
        console.log('Bấm tiếp tục sang câu tiếp theo...');
        await page.click('.vintage-continue-btn');
        await page.waitForTimeout(800);
        continue;
      }

      const isQuestion = await page.locator('.vintage-skip-btn').count() > 0;
      if (isQuestion) {
        console.log('Bấm bỏ qua câu hỏi...');
        await page.click('.vintage-skip-btn');
        await page.waitForTimeout(800);
        continue;
      }

      await page.waitForTimeout(500);
    }

    await page.waitForSelector('.vintage-results-parchment-panel', { timeout: 15000 });
    await page.waitForTimeout(1500);

    // Chụp Màn hình 4: Kết quả (Learn Results)
    const resultsPath = path.join(outDir, '04_learn_results_vintage.png');
    await page.screenshot({ path: resultsPath, fullPage: true });
    console.log(`📸 Đã chụp Màn hình Kết quả: ${resultsPath}`);

    // 5. Gửi thông báo và ảnh qua Telegram
    console.log('📤 Đang gửi các ảnh chụp qua Telegram...');
    await sendTelegramNotification(
      '🗺 <b>[Antigravity AI] BÁO CÁO THIẾT KẾ GIAO DIỆN CHẾ ĐỘ HỌC (LEARN MODE)</b>\n' +
      '• Phong cách: <b>Vintage Pirate Explorer / Antique Cartography</b>\n' +
      '• Trải nghiệm: Hải đồ cổ toàn màn hình, bản lệnh xuất bến, hải trình thuyền buồm di động, con dấu sáp mộc bản, và huân chương cập bến vinh quang.'
    );

    await sendTelegramPhoto(
      setupPath,
      '📜 1. BẢN LỆNH XUẤT BẾN (Learn Setup)\nKhung giấy da cổ lớn, hoa văn la bàn hải đồ, 4 thẻ tùy chọn học tập mộc bản & nút RPG [⚔ BẮT ĐẦU HẢI TRÌNH].'
    );

    await sendTelegramPhoto(
      questionPath,
      '🧭 2. KHẢO NGHIỆM TRI THỨC (Learn Question)\nThanh hải trình đứt nét nối Bến Cảng với Đảo Kho Báu, thuyền buồm di chuyển mượt mà, cuộn giấy da cổ với góc minh họa thuyền & la bàn, ô nhập mực bút lông.'
    );

    await sendTelegramPhoto(
      feedbackPath,
      '🎖 3. ĐÓNG DẤU KẾT QUẢ (Learn Feedback)\nDấu triện sáp mộc bản (Moss Green cho Đúng / Deep Red cho Cần nhớ lại), bảng so sánh 2 cột rõ ràng, phiên âm IPA & câu ví dụ.'
    );

    await sendTelegramPhoto(
      resultsPath,
      '🏆 4. CẬP BẾN VINH QUANG (Learn Results)\nHuân chương la bàn cổ mạ vàng, đồng hồ độ chính xác SVG cổ điển, huy hiệu thưởng XP thăng cấp, 6 thẻ chỉ số hải trình & sổ tay ghi chép từ cần ôn lại.'
    );

    console.log('🎉 Hoàn tất gửi 4 ảnh qua Telegram thành công!');
  } catch (err) {
    console.error('❌ Lỗi:', err);
  } finally {
    await browser.close();
  }
}

capture();
