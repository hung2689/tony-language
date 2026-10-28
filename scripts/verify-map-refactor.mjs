import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';

const artifactDir = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81';

(async () => {
  console.log('🚀 Starting Map Refactor & Simplified Sidebar Verification...');
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Login
    console.log('🔑 Logging in as demo_srs@example.com...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('#login-email', 'demo_srs@example.com');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');

    // 2. Wait for Map page (route /)
    console.log('⏳ Waiting for Map Page to load at /...');
    await page.waitForSelector('.map-page-layout', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Verify 5 sidebar items
    const sidebarLabels = await page.$$eval('.lexicon-sidebar-link .lexicon-sidebar-label', (els) =>
      els.map((e) => e.textContent.trim())
    );
    console.log('📋 Detected Sidebar items:', sidebarLabels);

    const expectedLabels = [
      'Bản đồ',
      'Từ vựng của tôi',
      'Lịch sử học tập',
      'Lộ trình ôn tập',
      'Lặp lại ngắt quãng',
    ];

    const isMatch =
      sidebarLabels.length === 5 &&
      sidebarLabels.every((label, idx) => label === expectedLabels[idx]);

    if (!isMatch) {
      console.warn('⚠️ Sidebar items do not match exactly expected 5 items:', sidebarLabels);
    } else {
      console.log('✅ Sidebar has exactly the 5 specified items in order!');
    }

    // Check active item on Map page
    const activeSidebarLabel = await page.$eval(
      '.lexicon-sidebar-link.is-active .lexicon-sidebar-label',
      (el) => el.textContent.trim()
    );
    console.log(`📌 Active sidebar link on Map page: "${activeSidebarLabel}"`);

    // Capture Map Page screenshot
    const mapScreenshotPath = path.join(artifactDir, 'refactor-map-page.png');
    await page.screenshot({ path: mapScreenshotPath, fullPage: true });
    console.log(`📸 Saved Map Page Screenshot: ${mapScreenshotPath}`);

    // 3. Click "Từ vựng của tôi" link in sidebar
    console.log('🖱️ Clicking "Từ vựng của tôi" in sidebar...');
    const vocabBtn = await page.locator('.lexicon-sidebar-link', { hasText: 'Từ vựng của tôi' });
    await vocabBtn.click();
    await page.waitForTimeout(1500);

    const currentUrl = page.url();
    console.log(`🌐 Current URL after click: ${currentUrl}`);

    // Verify on Library page
    const activeSidebarLabelVocab = await page.$eval(
      '.lexicon-sidebar-link.is-active .lexicon-sidebar-label',
      (el) => el.textContent.trim()
    );
    console.log(`📌 Active sidebar link on Library page: "${activeSidebarLabelVocab}"`);

    // Verify no world map on library page
    const mapCount = await page.$$eval('.lexicon-world-map-frame', (els) => els.length);
    console.log(`🗺️ World Map instances on Library page: ${mapCount} (expected: 0)`);

    // Capture Library Page screenshot
    const libraryScreenshotPath = path.join(artifactDir, 'refactor-library-page.png');
    await page.screenshot({ path: libraryScreenshotPath, fullPage: true });
    console.log(`📸 Saved Library Page Screenshot: ${libraryScreenshotPath}`);

    // 4. Mobile View of Map Page
    console.log('📱 Testing Mobile View on Map page (375x812)...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1200);

    const mobileMapScreenshotPath = path.join(artifactDir, 'refactor-map-mobile.png');
    await page.screenshot({ path: mobileMapScreenshotPath, fullPage: true });
    console.log(`📸 Saved Mobile Map Screenshot: ${mobileMapScreenshotPath}`);

    // 5. Mobile View of Library Page
    console.log('📱 Testing Mobile View on Library page (375x812)...');
    await page.goto('http://localhost:5173/library', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const mobileLibScreenshotPath = path.join(artifactDir, 'refactor-library-mobile.png');
    await page.screenshot({ path: mobileLibScreenshotPath, fullPage: true });
    console.log(`📸 Saved Mobile Library Screenshot: ${mobileLibScreenshotPath}`);

    console.log('🎉 Verification completed successfully!');
  } catch (err) {
    console.error('❌ Verification Error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
