import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';

async function run() {
  console.log('🚀 Starting Learn Flow screenshot capture...');
  const scratchDir = path.resolve('scratch');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('response', resp => {
    if (resp.url().includes('/api/')) {
      console.log('API RESP:', resp.status(), resp.request().method(), resp.url());
    }
  });

  // 1. Register test user
  const suffix = Date.now().toString().slice(-5);
  const testEmail = `learn_${suffix}@example.com`;
  const testUsername = `learn_${suffix}`;
  const testPass = 'Password123!';

  await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' });
  await page.fill('#reg-email', testEmail);
  await page.fill('#reg-username', testUsername);
  await page.fill('#reg-password', testPass);
  await page.fill('#reg-confirm-password', testPass);
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 10000 });
  console.log('✅ Registered test user.');

  // 2. Open Create Deck Modal
  const openModalBtn = page.locator('button:has-text("Tạo bộ từ"), button:has-text("+ Bộ từ mới"), button:has-text("Tạo bộ thẻ")').first();
  await openModalBtn.click();
  await page.waitForSelector('form.deck-form', { timeout: 5000 });
  console.log('✅ Opened Deck creation modal.');

  // Fill deck name
  await page.locator('input[placeholder*="Oxford"]').fill('Từ vựng Tiếng Anh Giao Tiếp');

  // Fill Card 1
  const termInputs = page.locator('input[placeholder*="Essential"]');
  const defInputs = page.locator('input[placeholder*="Cần thiết"]');

  await termInputs.nth(0).fill('surprise');
  await defInputs.nth(0).fill('sự bất ngờ');

  // Fill Card 2
  await termInputs.nth(1).fill('to run');
  await defInputs.nth(1).fill('chạy, đi nhanh');

  // Submit Deck creation via modal footer
  const submitBtn = page.locator('.modal-footer button[type="submit"]');
  await submitBtn.click();
  console.log('✅ Clicked submit deck button.');

  // Creation navigates directly to /decks/:id or stays on page
  await page.waitForURL(/\/decks\/\d+/, { timeout: 10000 });
  console.log('✅ Navigated to Deck Detail page:', page.url());

  // Click "Học" tab in StudyModeBar
  const learnBtn = page.locator('.study-mode-btn:has-text("Học")');
  await learnBtn.click();
  await page.waitForURL(/\/decks\/\d+\/learn/, { timeout: 10000 });
  console.log('✅ Reached Learn Mode route:', page.url());

  // ─────────────────────────────────────────────────────────────
  // Screenshot 1: Learn Setup
  // ─────────────────────────────────────────────────────────────
  await page.waitForTimeout(1000);
  const setupImg = path.join(scratchDir, 'learn_01_setup.png');
  await page.screenshot({ path: setupImg });
  console.log('📸 Captured 1: learn_01_setup.png');

  // Start Session (Bắt đầu học)
  const startBtn = page.locator('button.learn-pill-start-btn, button:has-text("Bắt đầu")').first();
  await startBtn.click();
  await page.waitForSelector('.learn-question-card, .learn-term-display', { timeout: 10000 });
  await page.waitForTimeout(800);

  // ─────────────────────────────────────────────────────────────
  // Screenshot 2: Learn Question
  // ─────────────────────────────────────────────────────────────
  const questionImg = path.join(scratchDir, 'learn_02_question.png');
  await page.screenshot({ path: questionImg });
  console.log('📸 Captured 2: learn_02_question.png');

  function getAnswer(prompt) {
    const p = prompt.toLowerCase();
    if (p.includes('surprise')) return 'bất ngờ'; // Prompt EN -> Input VI (accepts 'bất ngờ' via core phrase from 'sự bất ngờ')
    if (p.includes('bất ngờ')) return 'surprise'; // Prompt VI -> Input EN
    if (p.includes('run')) return 'chạy'; // Prompt EN -> Input VI
    if (p.includes('chạy')) return 'run'; // Prompt VI -> Input EN (accepts 'run' from 'to run')
    return 'surprise';
  }

  // 3. Submit an answer testing the Core-phrase rule
  const promptEl = page.locator('.learn-prompt-text');
  await promptEl.waitFor({ state: 'visible', timeout: 10000 });
  const promptText = await promptEl.innerText();
  console.log('Current Question Prompt:', promptText);

  const ans = getAnswer(promptText);
  await page.fill('.learn-answer-input', ans);
  await page.keyboard.press('Enter');
  await page.waitForSelector('.learn-feedback-banner', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // ─────────────────────────────────────────────────────────────
  // Screenshot 3: Learn Feedback (Accepted & Note)
  // ─────────────────────────────────────────────────────────────
  const feedbackImg = path.join(scratchDir, 'learn_03_feedback.png');
  await page.screenshot({ path: feedbackImg });
  console.log('📸 Captured 3: learn_03_feedback.png');

  // 4. Complete remaining cards to reach Results Screen
  for (let step = 0; step < 25; step++) {
    if ((await page.locator('.learn-results-card').count()) > 0) {
      console.log('✅ Reached Results card!');
      break;
    }

    const continueBtn = page.locator('.learn-continue-btn');
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
      continue;
    }

    const input = page.locator('.learn-answer-input');
    if (await input.isVisible().catch(() => false)) {
      const qText = (await page.locator('.learn-prompt-text').innerText()).toLowerCase();
      const a = getAnswer(qText);

      await input.fill(a);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(800);
      continue;
    }

    await page.waitForTimeout(400);
  }

  // ─────────────────────────────────────────────────────────────
  // Screenshot 4: Learn Results
  // ─────────────────────────────────────────────────────────────
  await page.waitForSelector('.learn-results-container, .learn-results-card', { timeout: 15000 });
  await page.waitForTimeout(1000);
  const resultsImg = path.join(scratchDir, 'learn_04_results.png');
  await page.screenshot({ path: resultsImg });
  console.log('📸 Captured 4: learn_04_results.png');

  await browser.close();
  console.log('\n🎉 ALL 4 LEARN FLOW SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('❌ Flow capture failed:', err);
  process.exit(1);
});
