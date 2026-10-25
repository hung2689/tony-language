import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'screenshots', 'redesign_options');

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
  if (!token || !chatId || !fs.existsSync(photoPath)) {
    console.log(`Skipping telegram send for ${photoPath}`);
    return false;
  }

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
      console.log(`✅ Sent photo: ${path.basename(photoPath)}`);
    } else {
      console.error(`❌ Failed: ${data.description}`);
    }
    return data.ok;
  } catch (err) {
    console.error('Error sending photo:', err.message);
    return false;
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    locale: 'vi-VN',
  });
  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'dev@languagelearning.com');
  await page.fill('input[type="password"]', 'DevPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/');
  await page.waitForTimeout(1000);

  console.log('Finding deck with cards...');
  const deckList = await page.$$eval('.monochrome-deck-card', cards => cards.map((c, i) => ({
    index: i,
    title: c.querySelector('h3')?.innerText,
    countText: c.querySelector('.monochrome-count-pill')?.innerText || ''
  })));
  console.log('Decks found:', deckList);

  // Pick deck that has > 0 cards, or the first one
  const targetDeck = deckList.find(d => !d.countText.includes('0 thẻ')) || deckList[0];
  const targetIndex = targetDeck ? targetDeck.index : 0;
  console.log('Selecting deck index:', targetIndex);

  const cards = page.locator('.monochrome-deck-card');
  await cards.nth(targetIndex).click();
  await page.waitForTimeout(1500);
  console.log('Current URL after click:', page.url());

  // Wait for loading cards
  await page.waitForTimeout(1500);

  // 1. Capture Flashcard
  console.log('📸 Taking Flashcard Study View...');
  const shotOpt1 = path.join(outDir, 'option1_flashcard_study.png');
  await page.screenshot({ path: shotOpt1 });

  // 2. Capture Vocabulary Inventory Table
  console.log('📸 Checking Vocabulary Inventory Section...');
  const inventory = page.locator('.deck-vocab-inventory-section');
  const invCount = await inventory.count();
  console.log('Inventory section count:', invCount);
  if (invCount > 0) {
    await inventory.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const shotOpt2 = path.join(outDir, 'option2_deck_vocab_inventory.png');
    await page.screenshot({ path: shotOpt2 });
    await sendTelegramPhoto(
      shotOpt2,
      '🖼️ [Lựa chọn 2] Phân hệ Kho từ vựng Notion-style trong Bộ thẻ:\n• Bảng từ vựng mật độ cao với thanh tìm kiếm tức thì Instant Search\n• Bộ lọc thông minh (Tất cả, Có câu ví dụ, Có phiên âm IPA) và nút nghe phát âm âm thanh trực tiếp'
    );
  } else {
    console.log('Inventory section not rendered (deck may have 0 cards). Taking full page...');
    const shotOpt2 = path.join(outDir, 'option2_deck_vocab_inventory.png');
    await page.screenshot({ path: shotOpt2, fullPage: true });
    await sendTelegramPhoto(
      shotOpt2,
      '🖼️ [Lựa chọn 2] Chi tiết Bộ thẻ & Chế độ học tập trực quan'
    );
  }

  // Also send Option 2 Library Grid
  const shotOpt2Grid = path.join(outDir, 'option2_library_grid.png');
  if (fs.existsSync(shotOpt2Grid)) {
    await sendTelegramPhoto(
      shotOpt2Grid,
      '🖼️ [Lựa chọn 2] Thư viện Bộ thẻ Glassmorphism:\n• Giao diện thẻ kính mờ cao cấp, hiển thị thư mục phân loại\n• Bộ chuyển đổi chế độ xem Grid (Thẻ lưới) / List (Danh sách bảng tính) linh hoạt'
    );
  }

  await browser.close();
  console.log('Done debug capture.');
}

run();
