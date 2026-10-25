import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactDir = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81';

(async () => {
  console.log('🚀 Starting Sidebar Issues Verification...');
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
    await page.waitForTimeout(1000);

    // 1. Capture Full Page Expanded State
    const shotExpanded = path.join(artifactDir, '32-sidebar-expanded-fixed.png');
    await page.screenshot({ path: shotExpanded });
    console.log(`📸 32: Saved expanded state: ${shotExpanded}`);

    // 2. Capture Top Toggle Buttons Closeup
    const sidebarTopBrand = await page.$('.sidebar-top-brand');
    const topbarControls = await page.$('.topbar-left-controls');
    if (sidebarTopBrand) {
      const shotTopControls = path.join(artifactDir, '33-sidebar-top-toggle-fixed.png');
      await sidebarTopBrand.screenshot({ path: shotTopControls });
      console.log(`📸 33: Saved top toggle closeup: ${shotTopControls}`);
    }

    // 3. Capture Bottom User Profile Closeup
    const userBlock = await page.$('.sidebar-user-block');
    if (userBlock) {
      const shotUserBlock = path.join(artifactDir, '34-sidebar-user-profile-fixed.png');
      await userBlock.screenshot({ path: shotUserBlock });
      console.log(`📸 34: Saved user profile closeup: ${shotUserBlock}`);

      // 4. Test clicking user profile to open menu
      console.log('🖱️ Clicking user profile block...');
      await userBlock.click();
      await page.waitForTimeout(600);

      const shotUserMenu = path.join(artifactDir, '35-sidebar-user-menu-opened.png');
      await userBlock.screenshot({ path: shotUserMenu });
      console.log(`📸 35: Saved user menu opened: ${shotUserMenu}`);

      // Close menu by clicking outside
      await page.click('.library-momentum-hero');
      await page.waitForTimeout(400);
    }

    // 5. Test Collapsing Sidebar via topbar button or sidebar button
    console.log('🖱️ Testing sidebar collapse button...');
    const collapseBtn = await page.$('.sidebar-collapse-btn');
    if (collapseBtn) {
      await collapseBtn.click();
      await page.waitForTimeout(600);

      const isCollapsed = await page.$eval('.reference-sidebar', el => el.classList.contains('is-collapsed'));
      console.log(`✅ Sidebar isCollapsed: ${isCollapsed}`);

      const shotCollapsed = path.join(artifactDir, '36-sidebar-collapsed-state.png');
      await page.screenshot({ path: shotCollapsed });
      console.log(`📸 36: Saved collapsed state: ${shotCollapsed}`);

      // Test expanding sidebar back via topbar toggle
      console.log('🖱️ Testing topbar toggle expand button...');
      const topbarToggle = await page.$('.topbar-sidebar-toggle-btn');
      if (topbarToggle) {
        await topbarToggle.click();
        await page.waitForTimeout(600);

        const isExpandedAgain = await page.$eval('.reference-sidebar', el => !el.classList.contains('is-collapsed'));
        console.log(`✅ Sidebar isExpanded again: ${isExpandedAgain}`);
      }
    }

    console.log('🎉 Verification complete successfully!');
  } catch (err) {
    console.error('❌ Verification error:', err);
  } finally {
    await browser.close();
  }
})();
