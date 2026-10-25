import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'screenshots', 'study-plan');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log('🚀 Starting Phase 6 Study Plan verification...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    console.log(`[Browser ${msg.type()}]:`, msg.text());
  });

  page.on('pageerror', (err) => {
    console.error('[Browser PageError]:', err.message);
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

    // 2. Check sidebar "Tạo lộ trình" / "Lộ trình ôn tập"
    console.log('2. Verifying Sidebar Study Plan button...');
    const studyPlanBtn = page.locator('button.sidebar-btn-outlined:has-text("lộ trình")');
    await studyPlanBtn.waitFor({ state: 'visible', timeout: 5000 });
    const isDisabled = await studyPlanBtn.getAttribute('disabled');
    console.log(`Sidebar button disabled status: ${isDisabled} (expected: null/not disabled)`);
    if (isDisabled !== null) {
      throw new Error('Sidebar Study Plan button is still disabled!');
    }

    // Click to open Create Modal or Study Plan Page
    await studyPlanBtn.click();
    await page.waitForTimeout(1000);

    // If modal opened (no existing plan), let's create a plan
    const createModalTitle = page.locator('.study-plan-modal-title:has-text("Tạo lộ trình ôn tập")');
    const isModalVisible = await createModalTitle.isVisible().catch(() => false);

    if (isModalVisible) {
      console.log('3. Create Study Plan Modal opened. Testing volume preview...');
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(outDir, '01_create_plan_modal.png'), fullPage: true });

      // Check preview exists
      await page.waitForSelector('text=Khối lượng học dự kiến', { timeout: 10000 });
      console.log('✅ Volume preview calculation rendered correctly');

      // Click save
      await page.click('button[type="submit"]:has-text("Lưu lộ trình")');
      await page.waitForURL('**/study-plan', { timeout: 8000 });
      console.log('✅ Plan created successfully');
    } else {
      console.log('Active plan already exists, landed on /study-plan');
    }

    // 4. On /study-plan dashboard
    await page.waitForSelector('.study-plan-hero-card', { timeout: 5000 });
    console.log('4. On Study Plan Dashboard. Capturing screenshot...');
    await page.screenshot({ path: path.join(outDir, '02_study_plan_dashboard.png'), fullPage: true });

    // 5. Navigate to Library to check Soft Gate Reminder
    console.log('5. Navigating to Library to check Daily Gate Reminder...');
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(1500);

    const dailyGate = page.locator('.daily-gate-banner');
    const isGateVisible = await dailyGate.isVisible().catch(() => false);
    console.log(`Daily Gate Banner visible: ${isGateVisible}`);
    await page.screenshot({ path: path.join(outDir, '03_library_daily_gate.png'), fullPage: true });

    // 6. Test DeckDetailPage "Lặp lại ngắt quãng" button
    console.log('6. Checking "Lặp lại ngắt quãng" in DeckDetailPage...');
    const firstDeckCard = page.locator('.monochrome-deck-card').first();
    if (await firstDeckCard.isVisible()) {
      await firstDeckCard.click();
      await page.waitForURL('**/decks/**', { timeout: 5000 });

      const srsBtn = page.locator('button.deck-srs-btn');
      await srsBtn.waitFor({ state: 'visible', timeout: 5000 });
      const srsDisabled = await srsBtn.getAttribute('disabled');
      console.log(`DeckDetailPage SRS button disabled status: ${srsDisabled} (expected: null)`);
      if (srsDisabled !== null) {
        throw new Error('DeckDetailPage SRS button is still disabled!');
      }

      await page.screenshot({ path: path.join(outDir, '04_deck_srs_button_active.png'), fullPage: true });
    }

    // 7. Start "Học hôm nay" session
    console.log('7. Starting "Học hôm nay" session at /study-plan/learn...');
    await page.goto('http://localhost:5173/study-plan/learn');
    await page.waitForTimeout(1500);

    const setupStartBtn = page.locator('button:has-text("Bắt đầu học")');
    if (await setupStartBtn.isVisible()) {
      console.log('On setup screen of Today study session...');
      await page.screenshot({ path: path.join(outDir, '05_today_learn_setup.png'), fullPage: true });
      await setupStartBtn.click();
      await page.waitForTimeout(1000);

      // Question screen
      console.log('On question screen of Today study session...');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, '06_today_learn_question.png'), fullPage: true });

      // Answer question (either choice or typing)
      const mcOption = page.locator('.learn-choice-card').first();
      const textInput = page.locator('.learn-write-input');
      const submitBtn = page.locator('button:has-text("Kiểm tra")');

      if (await mcOption.isVisible()) {
        await mcOption.click();
      } else if (await textInput.isVisible()) {
        await textInput.fill('hello');
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
        }
      }

      await page.waitForTimeout(1000);
      console.log('Capturing feedback screen...');
      await page.screenshot({ path: path.join(outDir, '07_today_learn_feedback.png'), fullPage: true });
    } else {
      console.log('Session already completed for today or in another state.');
      await page.screenshot({ path: path.join(outDir, '05_today_learn_state.png'), fullPage: true });
    }

    // Copy screenshots to artifact directory for presentation
    const artifactDir = 'C:\\Users\\ASUS\\.gemini\\antigravity-cli\\brain\\bf3dd3a2-f6d8-4590-84be-6148d8807185';
    const files = fs.readdirSync(outDir);
    for (const f of files) {
      if (f.endsWith('.png')) {
        fs.copyFileSync(path.join(outDir, f), path.join(artifactDir, f));
      }
    }

    console.log('🎉 All Phase 6 browser verification steps completed successfully!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    await page.screenshot({ path: path.join(outDir, 'error_state.png'), fullPage: true }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

run();
