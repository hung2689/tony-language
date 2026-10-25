import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'screenshots', 'analytics');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log('🚀 Starting Phase 7 Analytics verification...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 860 },
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

    // 2. Click "Thống kê" in Sidebar
    console.log('2. Clicking "Thống kê" in Sidebar...');
    const analyticsBtn = page.locator('button.sidebar-nav-button:has-text("Thống kê")');
    await analyticsBtn.waitFor({ state: 'visible', timeout: 5000 });
    await analyticsBtn.click();

    await page.waitForURL('**/analytics', { timeout: 8000 });
    await page.waitForTimeout(1000);
    console.log('✅ Navigated to /analytics');

    // 3. Capture full overview of Analytics dashboard
    console.log('3. Capturing Analytics dashboard overview...');
    await page.screenshot({ path: path.join(outDir, '01_analytics_dashboard_overview.png'), fullPage: true });

    // 4. Hover on heatmap cell to test tooltip
    console.log('4. Testing heatmap interactive tooltip...');
    const heatmapCell = page.locator('.heatmap-cell').first();
    if (await heatmapCell.isVisible()) {
      await heatmapCell.hover();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, '02_heatmap_interactive_tooltip.png') });
      console.log('✅ Heatmap tooltip verified');
    }

    // 5. Test Retention Distribution section
    console.log('5. Verifying Retention distribution section...');
    const retentionSection = page.locator('.analytics-section:has-text("Phân bổ mức độ ghi nhớ")');
    await retentionSection.waitFor({ state: 'visible', timeout: 5000 });
    await page.screenshot({ path: path.join(outDir, '03_retention_distribution.png') });

    // 6. Test Weak Words & Direct Practice
    console.log('6. Checking Weak words section and practice button...');
    const practiceWeakBtn = page.locator('button.btn-practice-weak:has-text("Ôn tập ngay")');
    const hasWeakWords = await practiceWeakBtn.isVisible().catch(() => false);

    if (hasWeakWords) {
      console.log('Weak words available. Testing direct practice session...');
      await practiceWeakBtn.click();
      await page.waitForURL('**/analytics/practice', { timeout: 8000 });
      await page.waitForTimeout(1000);

      await page.screenshot({ path: path.join(outDir, '04_weak_words_practice_setup.png'), fullPage: true });

      const startSetupBtn = page.locator('button:has-text("Bắt đầu học")');
      if (await startSetupBtn.isVisible()) {
        await startSetupBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(outDir, '05_weak_words_practice_question.png'), fullPage: true });
        console.log('✅ Weak words practice session launched successfully');
      }
    } else {
      console.log('No weak words currently present.');
      await page.screenshot({ path: path.join(outDir, '04_no_weak_words_state.png'), fullPage: true });
    }

    // Copy screenshots to artifact directory
    const artifactDir = 'C:\\Users\\ASUS\\.gemini\\antigravity-cli\\brain\\bf3dd3a2-f6d8-4590-84be-6148d8807185';
    const files = fs.readdirSync(outDir);
    for (const f of files) {
      if (f.endsWith('.png')) {
        fs.copyFileSync(path.join(outDir, f), path.join(artifactDir, f));
      }
    }

    console.log('🎉 Phase 7 Analytics verification completed successfully!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    await page.screenshot({ path: path.join(outDir, 'error_state.png'), fullPage: true }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

run();
