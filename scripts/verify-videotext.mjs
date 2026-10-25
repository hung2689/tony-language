import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactDir = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81';

(async () => {
  console.log('🚀 Starting Playwright VideoText verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    console.log('Navigating to http://localhost:5173/login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });

    console.log('🔑 Logging in as demo_srs@example.com...');
    await page.fill('#login-email', 'demo_srs@example.com');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    console.log('📂 Navigating to Library Workspace (/)...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.momentum-videotext-box', { timeout: 8000 });

    // Wait 2 seconds for video playback to begin
    await page.waitForTimeout(2000);

    const shotPath = path.join(artifactDir, '25-videotext-preview.png');
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`📸 Saved screenshot to: ${shotPath}`);

    // Take a zoomed-in clip of the VideoText element specifically
    const videoBox = await page.$('.momentum-videotext-box');
    if (videoBox) {
      const clipPath = path.join(artifactDir, '26-videotext-closeup.png');
      await videoBox.screenshot({ path: clipPath });
      console.log(`📸 Saved close-up screenshot to: ${clipPath}`);
    }

    console.log('Console Errors:', consoleErrors);
  } catch (err) {
    console.error('❌ Verification error:', err);
  } finally {
    await browser.close();
  }
})();
