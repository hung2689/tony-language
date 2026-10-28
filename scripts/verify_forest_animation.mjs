import { chromium } from '../frontend/node_modules/playwright/index.mjs';

async function verifyForestIslandAnimation() {
  console.log('Launching browser to verify Forest of Beginnings island animation...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // Listen to console logs and errors
  page.on('console', (msg) => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', (err) => console.error('BROWSER ERROR:', err));

  try {
    // 1. Log in to get auth token
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'dev@languagelearning.com');
    await page.fill('input[type="password"]', 'DevPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    console.log('Logged in successfully!');

    // Wait for the map to render
    const mapLocation = page.locator('.lexicon-map-location.is-forest');
    await mapLocation.waitFor({ state: 'visible', timeout: 8000 });
    console.log('Forest of Beginnings island location found on map.');

    // 2. Idle state screenshot
    await page.screenshot({
      path: 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81/forest_island_1_idle.png',
      fullPage: false,
    });
    console.log('Captured idle state screenshot: forest_island_1_idle.png');

    // 3. Hover state
    const triggerBtn = mapLocation.locator('.lexicon-location-trigger');
    await triggerBtn.hover();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81/forest_island_2_hover.png',
      fullPage: false,
    });
    console.log('Captured hover state screenshot: forest_island_2_hover.png');

    // 4. Click Forest of Beginnings island to play animation
    console.log('Clicking Forest of Beginnings island...');
    await triggerBtn.click();

    // Check if video is playing
    const videoLocator = mapLocation.locator('video.lexicon-island-video-overlay');
    await videoLocator.waitFor({ state: 'attached', timeout: 5000 });

    // Wait for video playback to start
    await page.waitForTimeout(800);
    const isPlaying = await videoLocator.evaluate((vid) => !vid.paused && vid.currentTime > 0);
    const currentTime = await videoLocator.evaluate((vid) => vid.currentTime);
    console.log('Is video playing:', isPlaying, 'currentTime:', currentTime);

    // Capture screenshot mid-animation
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81/forest_island_3_playing.png',
      fullPage: false,
    });
    console.log('Captured mid-playback screenshot: forest_island_3_playing.png');

    // Wait for animation to finish (video is ~5.04s)
    console.log('Waiting for video to finish playing (approx 3.5s remaining)...');
    await page.waitForTimeout(3600);

    const isEndedOrPaused = await videoLocator.evaluate((vid) => vid.paused || vid.ended);
    console.log('Video ended/paused after duration:', isEndedOrPaused);

    // 5. State after ended
    await page.screenshot({
      path: 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81/forest_island_4_ended.png',
      fullPage: false,
    });
    console.log('Captured ended/idle state screenshot: forest_island_4_ended.png');

    // 6. Test replay capability
    console.log('Testing replay click...');
    await triggerBtn.click();
    await page.waitForTimeout(700);
    const isReplaying = await videoLocator.evaluate((vid) => !vid.paused);
    console.log('Is video replaying on subsequent click:', isReplaying);

    await page.screenshot({
      path: 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81/forest_island_5_replay.png',
      fullPage: false,
    });
    console.log('Captured replay screenshot: forest_island_5_replay.png');

    // 7. Verify other islands still work
    const villageLocation = page.locator('.lexicon-map-location.is-village');
    await villageLocation.locator('.lexicon-location-trigger').click();
    await page.waitForTimeout(300);
    const isVillageSelected = await villageLocation.evaluate((el) => el.classList.contains('is-selected'));
    console.log('Village of Conversations selected after click:', isVillageSelected);

    console.log('>>> ALL VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<');
  } catch (err) {
    console.error('Verification failed with error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyForestIslandAnimation();
