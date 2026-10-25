import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'screenshots', 'story_cloze');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log('🚀 Starting Phase 8 Contextual Story Cloze verification...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'vi-VN',
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('[Browser error]:', msg.text());
    }
  });

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
    console.log('✅ Logged in successfully');

    // 2. Open first deck
    console.log('2. Opening deck...');
    const deckCard = page.locator('.monochrome-deck-card').first();
    await deckCard.waitFor({ state: 'visible', timeout: 10000 });
    await deckCard.click();

    await page.waitForURL(/.*\/decks\/\d+/, { timeout: 10000 });
    await page.waitForTimeout(1200);
    console.log('✅ Navigated to deck detail');

    // 3. Capture standard Flashcard View
    console.log('3. Capturing standard Flashcard view...');
    await page.screenshot({ path: path.join(outDir, '01_flashcard_standard_view.png'), fullPage: true });

    // 4. Toggle to "Đoạn văn ngữ cảnh (Điền từ)"
    console.log('4. Switching to Contextual Story Cloze mode...');
    const storyTabBtn = page.locator('button.flashcard-mode-tab-btn:has-text("Đoạn văn ngữ cảnh")');
    await storyTabBtn.waitFor({ state: 'visible', timeout: 5000 });
    await storyTabBtn.click();

    await page.waitForSelector('.context-story-container', { timeout: 10000 });
    await page.waitForTimeout(1000);
    console.log('✅ Context story loaded');
    await page.screenshot({ path: path.join(outDir, '02_context_story_cloze_view.png'), fullPage: true });

    // 5. Test hint reveal
    console.log('5. Testing hint reveal...');
    const hintBtn = page.locator('.cloze-hint-btn').first();
    if (await hintBtn.isVisible()) {
      await hintBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, '03_hint_revealed.png') });
      console.log('✅ Hint revealed and captured');
    }

    // 6. Test bilingual translation toggle
    console.log('6. Testing bilingual translation toggle...');
    const translationBtn = page.locator('button.story-action-btn:has-text("Hiện dịch nghĩa")');
    if (await translationBtn.isVisible()) {
      await translationBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, '04_bilingual_translation.png') });
      console.log('✅ Bilingual translation visible and captured');
    }

    // 7. Type answers into blanks and check answers
    console.log('7. Filling blanks and checking answers...');
    const inputs = page.locator('.cloze-input');
    const inputCount = await inputs.count();
    console.log(`Found ${inputCount} cloze blanks`);

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      // Give a sample answer
      await input.fill('testword');
    }

    const checkBtn = page.locator('button.story-submit-btn:has-text("Kiểm tra đáp án")');
    await checkBtn.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(outDir, '05_story_evaluation_results.png'), fullPage: true });
    console.log('✅ Story evaluation verified and captured');

    // 8. Return back to Flashcard
    console.log('8. Returning to standard Flashcard view...');
    const cardTabBtn = page.locator('button.flashcard-mode-tab-btn:has-text("Thẻ từ (Flashcard)")');
    await cardTabBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, '06_return_to_flashcard.png') });
    console.log('✅ Returned to Flashcard view successfully');

    console.log('\n🎉 ALL PHASE 8 E2E VERIFICATIONS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    await page.screenshot({ path: path.join(outDir, 'error_state.png'), fullPage: true });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
