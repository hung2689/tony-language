import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';

const artifactDir = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81';

(async () => {
  console.log('🚀 Starting Dark Mode & Light Mode comprehensive verification...');
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
    await page.waitForTimeout(1500);

    // 2. Test Study Plan in Dark Mode
    console.log('🌙 Testing Study Plan in Dark Mode...');
    await page.goto('http://localhost:5173/study-plan', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('ll_theme_mode', 'dark');
    });
    await page.waitForTimeout(800);

    const studyPlanDarkFile = path.join(artifactDir, '47-studyplan-darkmode-1440px.png');
    await page.screenshot({ path: studyPlanDarkFile, fullPage: true });
    console.log(`📸 Saved screenshot: ${studyPlanDarkFile}`);

    // Check contrast and colors in Study Plan Dark Mode
    const studyPlanColors = await page.evaluate(() => {
      const title = document.querySelector('.study-plan-title-group h1');
      const subtitle = document.querySelector('.study-plan-subtitle');
      const statBox = document.querySelector('.stat-box');
      const statBoxVal = document.querySelector('.stat-box-value');
      const heroCard = document.querySelector('.study-plan-hero-card');
      const secBtn = document.querySelector('.btn-plan-secondary');
      const dangerBtn = document.querySelector('.btn-plan-danger');
      const progressContainer = document.querySelector('.study-plan-progress-container');

      const getStyle = (el) => el ? {
        color: window.getComputedStyle(el).color,
        backgroundColor: window.getComputedStyle(el).backgroundColor,
        borderColor: window.getComputedStyle(el).borderColor,
      } : null;

      return {
        title: getStyle(title),
        subtitle: getStyle(subtitle),
        statBox: getStyle(statBox),
        statBoxVal: getStyle(statBoxVal),
        heroCard: getStyle(heroCard),
        secBtn: getStyle(secBtn),
        dangerBtn: getStyle(dangerBtn),
        progressContainer: getStyle(progressContainer),
      };
    });
    console.log('📊 Study Plan Dark Mode computed styles:', JSON.stringify(studyPlanColors, null, 2));

    // Open Settings Modal in Dark Mode to verify modal styling
    console.log('⚙️ Testing Settings Modal in Dark Mode...');
    const settingsBtn = await page.$('.btn-plan-secondary:has-text("Cài đặt")');
    if (settingsBtn) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      const settingsModalFile = path.join(artifactDir, '48-studyplan-modal-darkmode.png');
      await page.screenshot({ path: settingsModalFile });
      console.log(`📸 Saved screenshot: ${settingsModalFile}`);
      // Close modal
      const cancelBtn = await page.$('.plan-modal-btn-cancel');
      if (cancelBtn) await cancelBtn.click();
      await page.waitForTimeout(400);
    }

    // 3. Test Analytics in Dark Mode
    console.log('🌙 Testing Analytics in Dark Mode...');
    await page.goto('http://localhost:5173/analytics', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('ll_theme_mode', 'dark');
    });
    await page.waitForTimeout(800);

    const analyticsDarkFile = path.join(artifactDir, '49-analytics-darkmode-1440px.png');
    await page.screenshot({ path: analyticsDarkFile, fullPage: true });
    console.log(`📸 Saved screenshot: ${analyticsDarkFile}`);

    // Check contrast and colors in Analytics Dark Mode
    const analyticsColors = await page.evaluate(() => {
      const heroBanner = document.querySelector('.analytics-hero-banner');
      const tierHeading = document.querySelector('.hero-tier-heading');
      const achievementsContainer = document.querySelector('.achievements-card-container');
      const unlockedTile = document.querySelector('.achievement-tile.is-unlocked');
      const inProgressTile = document.querySelector('.achievement-tile.is-in-progress');
      const heatmapSection = document.querySelector('.analytics-section');
      const retentionMastered = document.querySelector('.retention-card-mastered');
      const retentionUnseen = document.querySelector('.retention-card-wide');
      const dock = document.querySelector('.magic-dock-inner');

      const getStyle = (el) => el ? {
        color: window.getComputedStyle(el).color,
        backgroundColor: window.getComputedStyle(el).backgroundColor,
        borderColor: window.getComputedStyle(el).borderColor,
      } : null;

      return {
        heroBanner: getStyle(heroBanner),
        tierHeading: getStyle(tierHeading),
        achievementsContainer: getStyle(achievementsContainer),
        unlockedTile: getStyle(unlockedTile),
        inProgressTile: getStyle(inProgressTile),
        heatmapSection: getStyle(heatmapSection),
        retentionMastered: getStyle(retentionMastered),
        retentionUnseen: getStyle(retentionUnseen),
        dock: getStyle(dock),
      };
    });
    console.log('📊 Analytics Dark Mode computed styles:', JSON.stringify(analyticsColors, null, 2));

    // 4. Test Light Mode for both to ensure light mode is intact!
    console.log('☀️ Verifying Light Mode intactness...');
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ll_theme_mode', 'light');
    });
    await page.waitForTimeout(600);

    const analyticsLightFile = path.join(artifactDir, '50-analytics-lightmode-1440px.png');
    await page.screenshot({ path: analyticsLightFile, fullPage: true });
    console.log(`📸 Saved screenshot: ${analyticsLightFile}`);

    await page.goto('http://localhost:5173/study-plan', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const studyPlanLightFile = path.join(artifactDir, '51-studyplan-lightmode-1440px.png');
    await page.screenshot({ path: studyPlanLightFile, fullPage: true });
    console.log(`📸 Saved screenshot: ${studyPlanLightFile}`);

    console.log('🎉 Verification completed successfully!');
  } catch (err) {
    console.error('❌ Error during verification:', err);
  } finally {
    await browser.close();
  }
})();
