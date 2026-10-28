import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';

const artifactDir = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81';

(async () => {
  console.log('🚀 Starting RPG Library Workspace Verification...');
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

    console.log('⏳ Waiting for RPG library container to load...');
    await page.waitForSelector('.rpg-library-container', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // 2. Capture full desktop screenshot
    const desktopScreenshotPath = path.join(artifactDir, 'rpg-library-desktop.png');
    await page.screenshot({ path: desktopScreenshotPath, fullPage: true });
    console.log(`📸 Saved Desktop Screenshot: ${desktopScreenshotPath}`);

    // Also save viewport screenshot
    const viewportScreenshotPath = path.join(artifactDir, 'rpg-library-viewport.png');
    await page.screenshot({ path: viewportScreenshotPath, fullPage: false });
    console.log(`📸 Saved Viewport Screenshot: ${viewportScreenshotPath}`);

    // 3. Test Mobile view
    console.log('📱 Capturing Mobile view (375x812)...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    const mobileScreenshotPath = path.join(artifactDir, 'rpg-library-mobile.png');
    await page.screenshot({ path: mobileScreenshotPath, fullPage: true });
    console.log(`📸 Saved Mobile Screenshot: ${mobileScreenshotPath}`);

    console.log('✅ RPG Library Workspace Verification Completed Successfully!');
  } catch (err) {
    console.error('❌ Verification Error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
