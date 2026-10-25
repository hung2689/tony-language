import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sendTelegramPhoto } from './notify-telegram.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'screenshots', 'sentence_master');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

(async () => {
  console.log('🚀 Starting Screenshot Capture for AI Sentence Master & Gemini Key Modal...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    locale: 'vi-VN',
  });

  const page = await context.newPage();

  try {
    // 1. Login
    console.log('1. Logging in as dev user...');
    await page.goto('http://localhost:5173/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', 'dev@languagelearning.com');
    await page.fill('input[type="password"]', 'DevPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // 2. Open first deck
    console.log('2. Opening first deck...');
    const deckCard = page.locator('.monochrome-deck-card').first();
    await deckCard.waitFor({ state: 'visible', timeout: 8000 });
    await deckCard.click();
    await page.waitForURL(/.*\/decks\/\d+/, { timeout: 8000 });
    await page.waitForTimeout(1000);

    // 3. Switch to "Đặt câu (AI)" mode
    console.log('3. Navigating to Đặt câu (AI) mode...');
    const sentenceModeBtn = page.locator('.study-mode-btn:has-text("Đặt câu (AI)")');
    await sentenceModeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await sentenceModeBtn.click();
    await page.waitForTimeout(2000);

    // Screenshot 1: Overview of Sentence Challenge View
    console.log('📸 Capturing Shot 1: Sentence Challenge Overview...');
    const shot1 = path.join(outDir, '01_sentence_challenge_overview.png');
    await page.screenshot({ path: shot1, fullPage: true });

    // 4. Open Gemini Key Modal
    console.log('4. Opening Gemini Key Modal...');
    const geminiBtn = page.locator('.sentence-gemini-badge, .sentence-byok-btn').first();
    if (await geminiBtn.isVisible()) {
      await geminiBtn.click();
      await page.waitForTimeout(600);
      console.log('📸 Capturing Shot 2: Gemini Key Modal...');
      const shot2 = path.join(outDir, '02_gemini_key_modal.png');
      await page.screenshot({ path: shot2 });
      
      // Close modal
      const closeBtn = page.locator('.modal-close-btn, .gemini-cancel-btn').first();
      await closeBtn.click();
      await page.waitForTimeout(500);
    }

    // 5. Test typing a sentence and evaluate
    console.log('5. Entering sentence translation for evaluation...');
    const textarea = page.locator('.sentence-textarea');
    if (await textarea.isVisible()) {
      // Find the target word
      const targetWord = await page.locator('.sentence-pill-word').innerText().catch(() => 'word');
      await textarea.fill(`I feel very ${targetWord} after working hard all day.`);
      await page.waitForTimeout(400);

      const submitBtn = page.locator('.sentence-submit-btn');
      await submitBtn.click();
      await page.waitForTimeout(2500);

      console.log('📸 Capturing Shot 3: AI Evaluation Result...');
      const shot3 = path.join(outDir, '03_sentence_evaluation_result.png');
      await page.screenshot({ path: shot3, fullPage: true });

      // Send to Telegram
      console.log('📤 Sending screenshots to Telegram...');
      await sendTelegramPhoto(
        shot1,
        '✨ <b>[1/3] Giao diện Đặt câu với từ vựng (AI Sentence Master)</b>\n\n• Thanh tiến trình từng câu\n• Từ vựng mục tiêu, loại từ, phát âm âm thanh\n• Đề bài dịch tiếng Việt sinh động\n• Ô gõ câu tiếng Anh hỗ trợ phím tắt Ctrl+Enter'
      );
      
      const shot2 = path.join(outDir, '02_gemini_key_modal.png');
      if (fs.existsSync(shot2)) {
        await sendTelegramPhoto(
          shot2,
          '🔑 <b>[2/3] Giao diện Cấu hình Google Gemini AI Cá nhân (BYOK)</b>\n\n• Cho phép người dùng tự nạp API Key cá nhân miễn phí từ Google AI Studio\n• Lưu an toàn tuyệt đối tại trình duyệt (LocalStorage)\n• Nút Kiểm tra & Lưu xác thực key sống/chết trước khi lưu'
        );
      }

      await sendTelegramPhoto(
        shot3,
        '🌟 <b>[3/3] Kết quả Chấm điểm AI Tức thì</b>\n\n• Huy hiệu điểm số 0-100 & đánh giá chất lượng câu\n• Tick xanh xác nhận sử dụng đúng từ vựng mục tiêu\n• Nhận xét ngữ pháp, chia thì chi tiết\n• Gợi ý cách viết tự nhiên của người bản xứ kèm nút nghe phát âm'
      );
    }

    console.log('✅ All captures and Telegram notifications completed successfully!');
  } catch (err) {
    console.error('❌ Error during capture:', err);
  } finally {
    await browser.close();
  }
})();
