import { chromium } from '../frontend/node_modules/playwright/index.mjs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1800 } });
  await page.goto('http://localhost:5173/login');
  await page.fill('#login-email', 'demo_srs@example.com');
  await page.fill('#login-password', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  await page.goto('http://localhost:5173/analytics');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81/42-analytics-current-full.png', fullPage: true });

  await page.goto('http://localhost:5173/study-plan');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81/43-studyplan-current-full.png', fullPage: true });

  await browser.close();
  console.log('Done captures');
})();
