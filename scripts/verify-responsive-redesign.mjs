import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';

const artifactDir = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81';

const viewports = [
  { width: 1920, height: 1080, name: '1920px' },
  { width: 1440, height: 900, name: '1440px' },
  { width: 1024, height: 800, name: '1024px' },
  { width: 768, height: 1024, name: '768px' },
  { width: 390, height: 844, name: '390px' },
];

(async () => {
  console.log('🚀 Starting responsive verification for Study Plan & Analytics pages...');
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    // Login
    console.log('🔑 Logging in as demo_srs@example.com...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('#login-email', 'demo_srs@example.com');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // 1. Verify Study Plan Page across viewports
    console.log('📚 Verifying Study Plan Page...');
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('http://localhost:5173/study-plan', { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);

      // Check max-width & main container
      const containerWidth = await page.$eval('.study-plan-page', el => {
        const style = window.getComputedStyle(el);
        return {
          maxWidth: style.maxWidth,
          width: el.clientWidth,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
          paddingBottom: style.paddingBottom,
        };
      });
      console.log(`[Study Plan ${vp.name}] Container width: ${containerWidth.width}px, max-width: ${containerWidth.maxWidth}, pb: ${containerWidth.paddingBottom}`);

      const filename = path.join(artifactDir, `44-studyplan-${vp.name}.png`);
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`📸 Saved screenshot: ${filename}`);
    }

    // 2. Verify Analytics Page across viewports
    console.log('📊 Verifying Analytics Page...');
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('http://localhost:5173/analytics', { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);

      const containerWidth = await page.$eval('.analytics-page', el => {
        const style = window.getComputedStyle(el);
        return {
          maxWidth: style.maxWidth,
          width: el.clientWidth,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
          paddingBottom: style.paddingBottom,
        };
      });
      console.log(`[Analytics ${vp.name}] Container width: ${containerWidth.width}px, max-width: ${containerWidth.maxWidth}, pb: ${containerWidth.paddingBottom}`);

      const filename = path.join(artifactDir, `45-analytics-${vp.name}.png`);
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`📸 Saved screenshot: ${filename}`);
    }

    console.log('🎉 Responsive verification completed successfully!');
  } catch (err) {
    console.error('❌ Error during verification:', err);
  } finally {
    await browser.close();
  }
})();
