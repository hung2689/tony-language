import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactDir = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81';

(async () => {
  console.log('🚀 Starting Video Hero Redesign Verification...');
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Desktop Test (1440x900)
    const contextDesktop = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const page = await contextDesktop.newPage();

    console.log('🔑 Logging in as demo_srs@example.com...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('#login-email', 'demo_srs@example.com');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    console.log('📂 Navigating to Library Workspace (/)...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.library-momentum-hero', { timeout: 8000 });

    // Wait 2.5s for video playback to advance
    await page.waitForTimeout(2500);

    // Verify video element exists and is playing
    const videoHandle = await page.$('.momentum-hero-video');
    if (videoHandle) {
      const isPaused = await page.evaluate(v => v.paused, videoHandle);
      const currentTime = await page.evaluate(v => v.currentTime, videoHandle);
      const duration = await page.evaluate(v => v.duration, videoHandle);
      console.log(`🎬 Video status: paused=${isPaused}, currentTime=${currentTime}s, duration=${duration}s`);
    } else {
      console.error('❌ Video element not found!');
    }

    // Verify removed elements: paragraph should not exist
    const hasOldSubtitle = await page.$('.momentum-hero-subtitle');
    console.log(`🔍 Old subtitle paragraph exists: ${!!hasOldSubtitle} (Should be false)`);

    // Verify removed video preview card:
    const hasOldVideoBox = await page.$('.momentum-videotext-box');
    console.log(`🔍 Old separate video box exists: ${!!hasOldVideoBox} (Should be false)`);

    // Capture Desktop Full Page & Hero Closeup
    const desktopShot = path.join(artifactDir, '27-hero-video-desktop.png');
    await page.screenshot({ path: desktopShot });
    console.log(`📸 Desktop screenshot: ${desktopShot}`);

    const heroBox = await page.$('.library-momentum-hero');
    if (heroBox) {
      const heroShot = path.join(artifactDir, '28-hero-video-closeup.png');
      await heroBox.screenshot({ path: heroShot });
      console.log(`📸 Hero closeup: ${heroShot}`);
    }

    // Test clicking "+ Tạo bộ thẻ mới" button
    console.log('🖱️ Testing CTA button click...');
    const ctaBtn = await page.$('.momentum-cta-btn');
    if (ctaBtn) {
      await ctaBtn.click();
      await page.waitForTimeout(1000);
      const modalOpen = await page.$('.deck-form-modal, .modal-backdrop, [role="dialog"]');
      console.log(`✅ Modal opened upon clicking CTA: ${!!modalOpen}`);
      const modalShot = path.join(artifactDir, '29-hero-cta-modal-opened.png');
      await page.screenshot({ path: modalShot });
      console.log(`📸 Modal opened screenshot: ${modalShot}`);
    }
    await contextDesktop.close();

    // 2. Tablet Viewport (820x1180)
    console.log('📱 Testing Tablet viewport (820x1180)...');
    const contextTablet = await browser.newContext({
      viewport: { width: 820, height: 1180 }
    });
    const pageTablet = await contextTablet.newPage();
    await pageTablet.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await pageTablet.fill('#login-email', 'demo_srs@example.com');
    await pageTablet.fill('#login-password', 'Password123!');
    await pageTablet.click('button[type="submit"]');
    await pageTablet.waitForTimeout(1500);

    await pageTablet.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await pageTablet.waitForSelector('.library-momentum-hero', { timeout: 8000 });
    await pageTablet.waitForTimeout(2000);

    const tabletShot = path.join(artifactDir, '30-hero-video-tablet.png');
    await pageTablet.screenshot({ path: tabletShot });
    console.log(`📸 Tablet screenshot: ${tabletShot}`);
    await contextTablet.close();

    // 3. Mobile Viewport (390x844)
    console.log('📱 Testing Mobile viewport (390x844)...');
    const contextMobile = await browser.newContext({
      viewport: { width: 390, height: 844 }
    });
    const pageMobile = await contextMobile.newPage();
    await pageMobile.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await pageMobile.fill('#login-email', 'demo_srs@example.com');
    await pageMobile.fill('#login-password', 'Password123!');
    await pageMobile.click('button[type="submit"]');
    await pageMobile.waitForTimeout(1500);

    await pageMobile.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await pageMobile.waitForSelector('.library-momentum-hero', { timeout: 8000 });
    await pageMobile.waitForTimeout(2000);

    const mobileShot = path.join(artifactDir, '31-hero-video-mobile.png');
    await pageMobile.screenshot({ path: mobileShot });
    console.log(`📸 Mobile screenshot: ${mobileShot}`);
    await contextMobile.close();

    console.log('🎉 Verification complete!');
  } catch (err) {
    console.error('❌ Error during verification:', err);
  } finally {
    await browser.close();
  }
})();
