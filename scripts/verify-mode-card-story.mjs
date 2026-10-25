import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'screenshots', 'mode_card');

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
  console.log('🚀 Verifying StudyModeBar card for Context Story mode...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
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

    // 2. Open first deck
    console.log('2. Opening deck detail...');
    const deckCard = page.locator('.monochrome-deck-card').first();
    await deckCard.waitFor({ state: 'visible', timeout: 8000 });
    await deckCard.click();
    await page.waitForURL(/.*\/decks\/\d+/, { timeout: 8000 });
    await page.waitForTimeout(1000);

    // Shot 1: StudyModeBar showing "Đoạn văn ngữ cảnh" card alongside Flashcard & Học
    console.log('📸 Shot 1: StudyModeBar with 5 mode cards...');
    const shot1 = path.join(outDir, '01_study_mode_bar_with_story_card.png');
    await page.screenshot({ path: shot1, fullPage: true });

    // 3. Click on the "Đoạn văn ngữ cảnh" card in StudyModeBar
    console.log('3. Clicking "Đoạn văn ngữ cảnh" card in StudyModeBar...');
    const storyModeBtn = page.locator('.study-mode-btn:has-text("Đoạn văn ngữ cảnh")');
    await storyModeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await storyModeBtn.click();

    await page.waitForURL(/.*\/decks\/\d+\/story/, { timeout: 8000 });
    await page.waitForSelector('.context-story-container', { timeout: 8000 });
    await page.waitForTimeout(1200);

    // Shot 2: Story cloze mode active from StudyModeBar
    console.log('📸 Shot 2: Context Story mode active from StudyModeBar card...');
    const shot2 = path.join(outDir, '02_story_page_active_from_mode_card.png');
    await page.screenshot({ path: shot2, fullPage: true });

    // 4. Click back to Flashcard card in StudyModeBar
    console.log('4. Clicking "Flashcard" card in StudyModeBar to return...');
    const flashcardModeBtn = page.locator('.study-mode-btn:has-text("Flashcard")');
    await flashcardModeBtn.click();
    await page.waitForURL(/^http:\/\/localhost:5173\/decks\/\d+$/, { timeout: 8000 });
    await page.waitForTimeout(800);

    const shot3 = path.join(outDir, '03_back_to_flashcard_mode.png');
    await page.screenshot({ path: shot3, fullPage: true });
    console.log('📸 Shot 3: Returned to standard Flashcard view');

    console.log('📤 Sending updated screenshots to Telegram...');
    await sendTelegramPhoto(
      shot1,
      '📸 1. Card "Đoạn văn ngữ cảnh" mới đã xuất hiện trang trọng trên thanh Study Mode Bar (cùng với Flashcard, Học, Test/Game, Nghe chép)'
    );
    await sendTelegramPhoto(
      shot2,
      '📸 2. Khi nhấp vào card "Đoạn văn ngữ cảnh": Card chuyển trạng thái Active và mở ra toàn bộ không gian học điền từ khuyết'
    );
    await sendTelegramPhoto(
      shot3,
      '📸 3. Nhấp lại card "Flashcard": Chuyển đổi liền mạch về màn hình lật thẻ 3D'
    );

    console.log('🎉 Done verifying and sending mode card updates to Telegram!');
  } catch (err) {
    console.error('Error in mode card verification:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
