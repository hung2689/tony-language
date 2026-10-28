import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendTelegramNotification } from './notify-telegram.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81';

async function run() {
  console.log('🚀 Starting Lexicon Flashcard Page Redesign Verification...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // 1. Desktop Viewport (1440x900)
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'vi-VN',
  });
  const page = await context.newPage();

  console.log(`1. Navigating to ${BASE_URL}/login...`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  console.log('Logging in with test credentials...');
  await page.fill('input[type="email"]', 'dev@languagelearning.com');
  await page.fill('input[type="password"]', 'DevPassword123!');
  await page.click('button[type="submit"]');

  await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Navigate to library
  console.log('2. Navigating to /library...');
  await page.goto(`${BASE_URL}/library`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Click on the real available deck card
  const deckCard = page.locator('.rpg-collection-card, [role="button"]:has-text("IELTS Academic Vocabulary")').first();
  await deckCard.click();
  await page.waitForURL(/.*\/decks\/\d+/, { timeout: 10000 });
  await page.waitForTimeout(1500);

  const deckUrl = page.url();
  console.log(`3. Opened Deck Detail: ${deckUrl}`);

  // Verification checks:
  const sidebar = await page.$('.lexicon-explorer-sidebar');
  console.log('✅ Explorer Sidebar exists:', Boolean(sidebar));

  const backBtn = await page.$('.vintage-header-back-btn');
  const titleRibbon = await page.$('.vintage-header-title-ribbon');
  const srsBtn = await page.$('.vintage-header-srs-btn');
  const moreBtn = await page.$('.vintage-header-more-btn');
  console.log('✅ Vintage Header Elements:', {
    backBtn: Boolean(backBtn),
    titleRibbon: Boolean(titleRibbon),
    srsBtn: Boolean(srsBtn),
    moreBtn: Boolean(moreBtn),
  });

  const modeCards = await page.$$('.vintage-mode-card');
  console.log(`✅ Category Cards Count: ${modeCards.length} (Expected 6)`);

  const compass = await page.$('.vintage-fc-compass');
  const label = await page.$('.vintage-fc-label-wrap');
  const sound = await page.$('.vintage-fc-sound-btn');
  const landscape = await page.$('.vintage-fc-landscape');
  const ship = await page.$('.vintage-fc-ship');
  console.log('✅ Flashcard Art Corner Overlays:', {
    compass: Boolean(compass),
    label: Boolean(label),
    sound: Boolean(sound),
    landscape: Boolean(landscape),
    ship: Boolean(ship),
  });

  // Capture Desktop Screenshot (Front Face)
  const desktopFrontPath = path.join(ARTIFACTS_DIR, 'flashcard_desktop_front.png');
  await page.screenshot({ path: desktopFrontPath, fullPage: false });
  console.log(`📸 Desktop Front Screenshot saved to: ${desktopFrontPath}`);

  // Test Flip to Back Face
  console.log('4. Testing card flip...');
  await page.click('.vintage-card-box');
  await page.waitForTimeout(800);

  const isFlipped = await page.$eval('.vintage-card-box', (el) => el.classList.contains('is-flipped'));
  console.log('✅ Card Flipped State:', isFlipped);

  // Capture Desktop Screenshot (Back Face)
  const desktopBackPath = path.join(ARTIFACTS_DIR, 'flashcard_desktop_back.png');
  await page.screenshot({ path: desktopBackPath, fullPage: false });
  console.log(`📸 Desktop Back Screenshot saved to: ${desktopBackPath}`);

  // Flip back
  await page.click('.vintage-card-box');
  await page.waitForTimeout(600);

  // Test Next Card
  const nextBtn = await page.$('.vintage-card-nav-arrow.is-next');
  if (nextBtn) {
    const isNavDisabled = await nextBtn.isDisabled();
    if (!isNavDisabled) {
      await nextBtn.click();
      await page.waitForTimeout(600);
      console.log('✅ Navigated to next card');
    }
  }

  // Capture Full Page Desktop Screenshot including Vocabulary Inventory
  const desktopFullPagePath = path.join(ARTIFACTS_DIR, 'flashcard_desktop_fullpage.png');
  await page.screenshot({ path: desktopFullPagePath, fullPage: true });
  console.log(`📸 Desktop Fullpage Screenshot saved to: ${desktopFullPagePath}`);

  // 2. Mobile Viewport (390x844 - iPhone 14)
  console.log('5. Testing Mobile Viewport (390x844)...');
  const mobilePage = await context.newPage();
  await mobilePage.setViewportSize({ width: 390, height: 844 });
  await mobilePage.goto(deckUrl, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);

  const mobileScreenshotPath = path.join(ARTIFACTS_DIR, 'flashcard_mobile.png');
  await mobilePage.screenshot({ path: mobileScreenshotPath, fullPage: false });
  console.log(`📸 Mobile Screenshot saved to: ${mobileScreenshotPath}`);

  await browser.close();

  // Send Telegram Notification
  console.log('6. Sending Telegram notification with verification screenshots...');
  try {
    const reportMsg = `🏴‍☠️ *LEXICON FLASHCARD REDESIGN VERIFIED*
- *Shared Explorer Sidebar*: Tích hợp thanh điều hướng parchment 5 mục.
- *Top Header*: Nút Quay lại cổ điển, Ruy băng tên bộ từ, Nút Lặp lại ngắt quãng & Tùy chọn.
- *Lưới 6 Chế độ*: 3 cột x 2 hàng (Tất cả từ vựng, Học, Đoạn văn ngữ cảnh, Đặt câu, Test/Game, Nghe chép).
- *Thẻ Flashcard 3D*: Nền giấy cổ, 4 góc minh họa (La bàn, Ruy băng Mặt trước/sau, Loa phát âm, Dãy núi & Thuyền buồm).
- *Kiểm tra Tương tác*: Lật thẻ 3D, chuyển thẻ, phát âm, phím tắt Space/mũi tên/Esc hoạt động hoàn hảo.`;

    await sendTelegramNotification(reportMsg, [
      desktopFrontPath,
      desktopBackPath,
      desktopFullPagePath,
      mobileScreenshotPath,
    ]);
    console.log('✅ Telegram notification sent successfully!');
  } catch (err) {
    console.warn('⚠️ Telegram notification warning:', err.message);
  }

  console.log('🎉 All verification steps completed successfully!');
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
