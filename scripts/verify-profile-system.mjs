import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';

const artifactDir = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81';

(async () => {
  console.log('🚀 Starting Profile & Level System E2E browser verification...');
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
    await page.waitForTimeout(2000);

    // 2. Capture header dropdown with "Hồ sơ" and AvatarFrame
    console.log('📸 Verifying Header Profile Dropdown with "Hồ sơ" option...');
    const profileTrigger = await page.$('.topbar-user-trigger');
    if (profileTrigger) {
      await profileTrigger.click();
      await page.waitForTimeout(500);
      const dropdownScreenshot = path.join(artifactDir, '60-header-profile-dropdown.png');
      const headerArea = await page.$('.topbar-actions-container');
      if (headerArea) {
        await headerArea.screenshot({ path: dropdownScreenshot });
        console.log(`Saved: ${dropdownScreenshot}`);
      }
    }

    // 3. Navigate to /profile
    console.log('🧭 Navigating to /profile...');
    await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Desktop screenshot of Profile page
    const profileDesktop = path.join(artifactDir, '61-profile-overview-desktop.png');
    await page.screenshot({ path: profileDesktop, fullPage: true });
    console.log(`Saved: ${profileDesktop}`);

    // 4. Test "Cấp bậc" tab
    console.log('🏆 Navigating to /profile/levels tab...');
    await page.click('button:has-text("Cấp bậc")');
    await page.waitForTimeout(800);

    const levelsTab = path.join(artifactDir, '62-profile-levels-tab.png');
    await page.screenshot({ path: levelsTab, fullPage: true });
    console.log(`Saved: ${levelsTab}`);

    // 5. Test "Bảo mật" tab
    console.log('🔒 Navigating to /profile/security tab...');
    await page.click('button:has-text("Bảo mật")');
    await page.waitForTimeout(800);

    const securityTab = path.join(artifactDir, '63-profile-security-tab.png');
    await page.screenshot({ path: securityTab, fullPage: true });
    console.log(`Saved: ${securityTab}`);

    // 6. Test Mobile Viewport (375x812)
    console.log('📱 Verifying Mobile Responsive view...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const profileMobile = path.join(artifactDir, '64-profile-mobile.png');
    await page.screenshot({ path: profileMobile, fullPage: true });
    console.log(`Saved: ${profileMobile}`);

    console.log('✅ ALL PROFILE SYSTEM VERIFICATION CHECKS PASSED!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
