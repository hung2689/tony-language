import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'screenshots', 'gallery');

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
  if (!token || !chatId || !fs.existsSync(photoPath)) return false;

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
    return data.ok;
  } catch (err) {
    console.error('Error sending photo:', err.message);
    return false;
  }
}

async function run() {
  console.log('🚀 Capturing UI Gallery...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 880 },
    locale: 'vi-VN',
  });

  const page = await context.newPage();

  try {
    // 1. Login
    console.log('1. Logging in...');
    await page.goto('http://localhost:5173/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', 'dev@languagelearning.com');
    await page.fill('input[type="password"]', 'DevPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Shot 1: Home / Library
    console.log('📸 Shot 1: Library & Home...');
    const shot1 = path.join(outDir, '01_library_home.png');
    await page.screenshot({ path: shot1, fullPage: true });

    // Shot 2: Deck Detail & Flashcard View
    console.log('📸 Shot 2: Deck Detail & Flashcard...');
    const deckCard = page.locator('.monochrome-deck-card').first();
    await deckCard.waitFor({ state: 'visible', timeout: 8000 });
    await deckCard.click();
    await page.waitForURL(/.*\/decks\/\d+/, { timeout: 8000 });
    await page.waitForTimeout(1000);
    const shot2 = path.join(outDir, '02_flashcard_view.png');
    await page.screenshot({ path: shot2, fullPage: true });

    // Shot 3: Contextual Story Cloze
    console.log('📸 Shot 3: Story Cloze Mode...');
    const shot3 = path.join(outDir, '03_context_story_cloze.png');
    const storyTabBtn = page.locator('button.flashcard-mode-tab-btn:has-text("Đoạn văn ngữ cảnh")');
    if (await storyTabBtn.isVisible()) {
      await storyTabBtn.click();
      await page.waitForSelector('.context-story-container', { timeout: 8000 });
      await page.waitForTimeout(1000);

      // Open a hint
      const hintBtn = page.locator('.cloze-hint-btn').first();
      if (await hintBtn.isVisible()) {
        await hintBtn.click();
      }
      // Toggle translation
      const translationBtn = page.locator('button.story-action-btn:has-text("Hiện dịch nghĩa")');
      if (await translationBtn.isVisible()) {
        await translationBtn.click();
      }
      await page.waitForTimeout(500);
      await page.screenshot({ path: shot3, fullPage: true });
    }

    // Shot 4: Analytics Dashboard & Heatmap
    console.log('📸 Shot 4: Analytics & Heatmap...');
    await page.goto('http://localhost:5173/analytics');
    await page.waitForTimeout(1200);
    const shot4 = path.join(outDir, '04_analytics_dashboard.png');
    await page.screenshot({ path: shot4, fullPage: true });

    // Shot 5: Study Plan Dashboard
    console.log('📸 Shot 5: Study Plan...');
    await page.goto('http://localhost:5173/study-plan');
    await page.waitForTimeout(1200);
    const shot5 = path.join(outDir, '05_study_plan.png');
    await page.screenshot({ path: shot5, fullPage: true });

    console.log('📤 Sending screenshots to Telegram...');
    await sendTelegramPhoto(shot1, '📸 1. Thư viện từ vựng & Không gian học tập (Library Dashboard)');
    await sendTelegramPhoto(shot2, '📸 2. Giao diện Thẻ từ Flashcard với thanh chuyển chế độ mới');
    await sendTelegramPhoto(shot3, '📸 3. Chế độ tạo đoạn văn ngữ cảnh & điền từ vựng (Context Cloze Story)');
    await sendTelegramPhoto(shot4, '📸 4. Bảng điều khiển Thống kê học tập & Biểu đồ nhiệt hoạt động (Analytics Heatmap)');
    await sendTelegramPhoto(shot5, '📸 5. Lộ trình ôn tập ngắt quãng thông minh theo thuật toán SM-2 (Study Plan)');

    console.log('🎉 Done sending gallery to Telegram!');
  } catch (err) {
    console.error('Error during capture/send:', err);
  } finally {
    await browser.close();
  }
}

run();
