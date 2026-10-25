import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';

const artifactDir = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81';

(async () => {
  console.log('🚀 Starting Profile Dropdown + BorderBeam verification...');
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });

    // Login
    console.log('🔑 Logging in as demo_srs@example.com...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('#login-email', 'demo_srs@example.com');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // 1. Verify in Light Mode
    console.log('☀️ Verifying Profile Dropdown with BorderBeam in Light Mode...');
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ll_theme_mode', 'light');
    });
    await page.waitForTimeout(600);

    // Capture zoomed header area
    const profileTrigger = await page.$('.topbar-user-trigger');
    if (profileTrigger) {
      const triggerBox = await profileTrigger.boundingBox();
      console.log('Profile Trigger dimensions:', triggerBox);

      // Screenshot of header actions area
      const headerActions = await page.$('.topbar-actions-container');
      const lightTriggerFile = path.join(artifactDir, '52-profile-borderbeam-light.png');
      if (headerActions) {
        await headerActions.screenshot({ path: lightTriggerFile });
        console.log(`📸 Saved screenshot: ${lightTriggerFile}`);
      }

      // 2. Click to open dropdown
      console.log('🖱️ Clicking profile trigger to open dropdown...');
      await profileTrigger.click();
      await page.waitForTimeout(400);

      const dropdownOpen = await page.$('.topbar-user-dropdown');
      console.log('Dropdown menu opened successfully:', dropdownOpen !== null);

      const lightDropdownFile = path.join(artifactDir, '53-profile-dropdown-opened-light.png');
      if (headerActions) {
        await headerActions.screenshot({ path: lightDropdownFile });
        console.log(`📸 Saved screenshot: ${lightDropdownFile}`);
      }

      // Click outside to close
      await page.mouse.click(100, 100);
      await page.waitForTimeout(400);
    }

    // 3. Verify in Dark Mode
    console.log('🌙 Verifying Profile Dropdown with BorderBeam in Dark Mode...');
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('ll_theme_mode', 'dark');
    });
    await page.waitForTimeout(600);

    const headerActions = await page.$('.topbar-actions-container');
    const darkTriggerFile = path.join(artifactDir, '54-profile-borderbeam-dark.png');
    if (headerActions) {
      await headerActions.screenshot({ path: darkTriggerFile });
      console.log(`📸 Saved screenshot: ${darkTriggerFile}`);
    }

    // Open dropdown in Dark Mode
    const profileTriggerDark = await page.$('.topbar-user-trigger');
    if (profileTriggerDark) {
      await profileTriggerDark.click();
      await page.waitForTimeout(400);

      const darkDropdownFile = path.join(artifactDir, '55-profile-dropdown-opened-dark.png');
      if (headerActions) {
        await headerActions.screenshot({ path: darkDropdownFile });
        console.log(`📸 Saved screenshot: ${darkDropdownFile}`);
      }
    }

    console.log('🎉 Profile Dropdown + BorderBeam verification completed successfully!');
  } catch (err) {
    console.error('❌ Error during verification:', err);
  } finally {
    await browser.close();
  }
})();
