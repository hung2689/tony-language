import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';

const artifactDir = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81';

(async () => {
  console.log('🚀 Starting SRS Popup Redesign Verification...');
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

    // Wait for main view
    await page.waitForTimeout(2000);

    // 2. Navigate to Library (/library)
    console.log('📚 Navigating to /library...');
    await page.goto('http://localhost:5173/library', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 3. Open SRS Popup via quest button or direct deck navigation
    console.log('🔍 Looking for SRS popup trigger...');
    const srsBtn = await page.locator('button.journal-mini-quest-item', { hasText: 'Ôn tập SRS' });
    if (await srsBtn.count() > 0) {
      console.log('🎯 Found quest SRS button, clicking...');
      await srsBtn.click();
    } else {
      console.log('Navigate to first deck to open SRS popup...');
      const firstDeck = page.locator('.deck-card, .rpg-deck-card, [data-deck-id]').first();
      if (await firstDeck.count() > 0) {
        await firstDeck.click();
        await page.waitForSelector('.srs-quick-header-btn', { timeout: 5000 });
        await page.click('.srs-quick-header-btn');
      }
    }

    // Wait for popup card
    console.log('⏳ Waiting for .srs-popup-card...');
    await page.waitForSelector('.srs-popup-card', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify elements
    const title = await page.$eval('.srs-popup-main-title', el => el.textContent.trim());
    console.log(`📌 Popup Title: "${title}"`);

    const compassVisible = await page.isVisible('.srs-popup-compass-rose');
    console.log(`🧭 Compass Rose Visible: ${compassVisible}`);

    const closeBtnVisible = await page.isVisible('.srs-popup-close-btn');
    console.log(`✖️ Close Button Visible: ${closeBtnVisible}`);

    const stats = await page.$$eval('.srs-popup-stat-col', cols =>
      cols.map(c => ({
        label: c.querySelector('.srs-popup-stat-label')?.textContent?.trim(),
        val: c.querySelector('.srs-popup-stat-val')?.textContent?.trim(),
      }))
    );
    console.log('📊 3 Stats detected:', stats);

    const colsCount = await page.$$eval('.srs-popup-col', cols => cols.length);
    console.log(`📅 7-Day Forecast columns count: ${colsCount} (expected: 7)`);

    const todayCol = await page.$eval('.srs-popup-col.is-today .srs-popup-day-name', el => el.textContent.trim()).catch(() => 'None');
    console.log(`🌟 Today highlighted column: "${todayCol}"`);

    const ctaText = await page.$eval('.srs-popup-cta-btn', el => el.textContent.trim());
    console.log(`🔘 CTA Button text: "${ctaText}"`);

    // Capture Desktop Screenshot
    const desktopScreenshot = path.join(artifactDir, 'srs-popup-desktop.png');
    await page.screenshot({ path: desktopScreenshot });
    console.log(`📸 Saved Desktop Screenshot: ${desktopScreenshot}`);

    // Test Mobile Viewport (390 x 844)
    console.log('📱 Switching to mobile viewport (390x844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);

    const mobileScreenshot = path.join(artifactDir, 'srs-popup-mobile.png');
    await page.screenshot({ path: mobileScreenshot });
    console.log(`📸 Saved Mobile Screenshot: ${mobileScreenshot}`);

    // Test Close button action
    console.log('🖱️ Testing close button...');
    await page.click('.srs-popup-close-btn');
    await page.waitForTimeout(500);
    const isClosed = (await page.$$('.srs-popup-card')).length === 0;
    console.log(`✅ Popup closed properly: ${isClosed}`);

    console.log('🎉 Verification completed successfully!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
