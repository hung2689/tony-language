import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('#login-email', 'demo_srs@example.com');
  await page.fill('#login-password', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto('http://localhost:5173/analytics', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const outPath = path.resolve(__dirname, '../temp_screenshots/current_analytics_before.png');
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Saved screenshot to:', outPath);

  await browser.close();
})();
