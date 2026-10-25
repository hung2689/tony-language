import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactDir = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81';

(async () => {
  console.log('🚀 Verifying layout with sidebar completely removed...');
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
    await page.waitForTimeout(2000);

    // Check if sidebar exists in DOM
    const sidebarCount = await page.locator('.reference-sidebar').count();
    console.log('Sidebar count in DOM (should be 0):', sidebarCount);

    // Check brand in topbar
    const brandVisible = await page.locator('.topbar-brand-container').isVisible();
    console.log('Brand in header visible:', brandVisible);

    // Check dock visible
    const dockVisible = await page.locator('.app-floating-dock-wrapper').isVisible();
    console.log('Bottom Dock visible:', dockVisible);

    // Capture Full Desktop View (No Sidebar)
    const shotDesktop = path.join(artifactDir, '39-no-sidebar-desktop.png');
    await page.screenshot({ path: shotDesktop });
    console.log(`📸 39: Saved desktop no-sidebar view: ${shotDesktop}`);

    // Click User Profile to open dropdown
    const userTrigger = page.locator('.topbar-user-trigger');
    if (await userTrigger.isVisible()) {
      await userTrigger.click();
      await page.waitForTimeout(400);
      const shotDropdown = path.join(artifactDir, '40-topbar-profile-opened.png');
      await page.screenshot({ path: shotDropdown });
      console.log(`📸 40: Saved user dropdown opened: ${shotDropdown}`);

      // Close dropdown before mobile test
      await userTrigger.click();
      await page.waitForTimeout(300);
    }

    // Test Mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(600);
    const shotMobile = path.join(artifactDir, '41-no-sidebar-mobile.png');
    await page.screenshot({ path: shotMobile });
    console.log(`📸 41: Saved mobile view: ${shotMobile}`);

    console.log('🎉 Verification complete!');
  } catch (err) {
    console.error('❌ Error during verification:', err);
  } finally {
    await browser.close();
  }
})();
