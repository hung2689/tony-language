import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactDir = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81';

(async () => {
  console.log('🚀 Verifying Sidebar against reference...');
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    console.log('🔑 Logging in as demo_srs@example.com...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('#login-email', 'demo_srs@example.com');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    console.log('📂 Navigating to Library Workspace (/)...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.reference-sidebar', { timeout: 8000 });
    await page.waitForTimeout(2000);

    // Capture Full Page
    const shotFull = path.join(artifactDir, '37-sidebar-reference-match-full.png');
    await page.screenshot({ path: shotFull });
    console.log(`📸 37: Saved full view: ${shotFull}`);

    // Capture Sidebar Specifically
    const sidebarEl = await page.$('.reference-sidebar');
    if (sidebarEl) {
      const shotSidebar = path.join(artifactDir, '38-sidebar-reference-match-only.png');
      await sidebarEl.screenshot({ path: shotSidebar });
      console.log(`📸 38: Saved sidebar only: ${shotSidebar}`);
    }

    console.log('🎉 Verification complete!');
  } catch (err) {
    console.error('❌ Error during verification:', err);
  } finally {
    await browser.close();
  }
})();
