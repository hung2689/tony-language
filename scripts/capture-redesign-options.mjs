import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'screenshots', 'redesign_options');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function getBotConfigs() {
  const configs = [];
  const files = ['.env.telegram.anti', '.env.telegram.kiro', '.env.telegram'];

  for (const f of files) {
    const fullPath = path.join(rootDir, f);
    if (!fs.existsSync(fullPath)) continue;
    let token = null;
    let chatId = null;
    const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valParts] = trimmed.split('=');
      const val = valParts.join('=').trim();
      if (key === 'TELEGRAM_BOT_TOKEN') token = val;
      if (key === 'TELEGRAM_CHAT_ID') chatId = val;
    }
    if (token && chatId && !configs.some((c) => c.token === token)) {
      configs.push({ token, chatId, source: f });
    }
  }

  return configs;
}

async function sendTelegramPhoto(photoPath, caption) {
  const configs = getBotConfigs();
  if (configs.length === 0 || !fs.existsSync(photoPath)) {
    console.log(`Skipping telegram send for ${photoPath} (no bot config or file missing)`);
    return false;
  }

  let anySuccess = false;
  for (const cfg of configs) {
    const formData = new FormData();
    formData.append('chat_id', cfg.chatId);
    formData.append('caption', caption);
    const fileBlob = new Blob([fs.readFileSync(photoPath)], { type: 'image/png' });
    formData.append('photo', fileBlob, path.basename(photoPath));

    try {
      const res = await fetch(`https://api.telegram.org/bot${cfg.token}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        console.log(`✅ Sent photo via ${cfg.source}: ${path.basename(photoPath)}`);
        anySuccess = true;
      } else {
        console.error(`❌ Failed via ${cfg.source}: ${data.description}`);
      }
    } catch (err) {
      console.error(`Error sending photo via ${cfg.source}:`, err.message);
    }
  }

  return anySuccess;
}

async function run() {
  console.log('🚀 Starting Luxury Redesign Screenshot Capture...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 920 },
    locale: 'vi-VN',
  });

  const page = await desktopContext.newPage();

  try {
    // 0. Login
    console.log('0. Logging in...');
    await page.goto('http://localhost:5173/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', 'dev@languagelearning.com');
    await page.fill('input[type="password"]', 'DevPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/', { timeout: 15000 });
    await page.waitForTimeout(1200);

    // ==========================================
    // 1. LIBRARY & MOMENTUM HERO & LUXURY CARDS
    // ==========================================
    console.log('📸 1. Capturing Luxury Library Workspace & Hero Momentum...');
    const shotOpt2Grid = path.join(outDir, 'option2_library_grid.png');
    await page.screenshot({ path: shotOpt2Grid });

    // ==========================================
    // 2. DECK DETAIL & FLASHCARD STUDY VIEW
    // ==========================================
    console.log('📸 2. Capturing Deck Detail & Flashcard View...');
    await page.goto('http://localhost:5173/decks/11');
    await page.waitForTimeout(1500);

    const shotOpt1Study = path.join(outDir, 'option1_flashcard_study.png');
    await page.screenshot({ path: shotOpt1Study });

    // Scroll down for deck vocabulary inventory
    const shotOpt2Vocab = path.join(outDir, 'option2_deck_vocab_inventory.png');
    await page.evaluate(() => window.scrollBy(0, 450));
    await page.waitForTimeout(500);
    await page.screenshot({ path: shotOpt2Vocab });

    // ==========================================
    // 3. ANALYTICS BENTO GAMIFICATION HUB
    // ==========================================
    console.log('📸 3. Capturing Analytics VIP Black Titanium Tier & Badges...');
    await page.goto('http://localhost:5173/analytics');
    await page.waitForTimeout(1500);
    const shotOpt4Analytics = path.join(outDir, 'option4_gamification_analytics.png');
    await page.screenshot({ path: shotOpt4Analytics });

    // ==========================================
    // 4. STUDY PLAN TARGET GAUGE & STREAK
    // ==========================================
    console.log('📸 4. Capturing Study Plan Target Ring...');
    await page.goto('http://localhost:5173/study-plan');
    await page.waitForTimeout(1500);
    const shotOpt4StudyPlan = path.join(outDir, 'option4_study_plan_gauge.png');
    await page.screenshot({ path: shotOpt4StudyPlan });

    // ==========================================
    // 5. DARK MODE LUXURY OVERVIEW
    // ==========================================
    console.log('📸 5. Capturing Dark Mode Deep Slate...');
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('ll_theme_preference', 'dark');
    });
    await page.waitForTimeout(800);
    const shotOpt3Dark = path.join(outDir, 'option3_dark_mode_overview.png');
    await page.screenshot({ path: shotOpt3Dark });

    // ==========================================
    // 6. MOBILE BOTTOM NAV
    // ==========================================
    console.log('📸 6. Capturing Mobile Bottom Bar...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      locale: 'vi-VN',
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('http://localhost:5173/login');
    await mobilePage.fill('input[type="email"]', 'dev@languagelearning.com');
    await mobilePage.fill('input[type="password"]', 'DevPassword123!');
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL('http://localhost:5173/', { timeout: 15000 });
    await mobilePage.waitForTimeout(1200);

    const shotOpt3Mobile = path.join(outDir, 'option3_mobile_bottom_nav.png');
    await mobilePage.screenshot({ path: shotOpt3Mobile });
    await mobileContext.close();

    // ==========================================
    // SEND ALL PHOTOS TO TELEGRAM
    // ==========================================
    console.log('📤 Sending All Redesigned Photos to Telegram...');

    await sendTelegramPhoto(
      shotOpt2Grid,
      '✨ [THIẾT KẾ MỚI] Không Gian Thư Viện Độc Bản Neo-Monochrome:\n• Banner Động lực Chào mừng nồng ấm ("Chào mừng trở lại!")\n• Thẻ Bộ từ phong cách Bento Black & White cao cấp kèm Cover Art ánh kim\n• Sidebar Thương hiệu LEXICON tinh gọn, thanh thoát chuẩn Thụy Sĩ'
    );

    await sendTelegramPhoto(
      shotOpt1Study,
      '✨ [THIẾT KẾ MỚI] Trải Nghiệm Học Flashcard Cao Cấp:\n• Bo góc chuẩn Apple Card (24px) với chiều sâu đa tầng mềm mại\n• Tinh chỉnh phông chữ sắc nét & phím tắt thông minh'
    );

    await sendTelegramPhoto(
      shotOpt4Analytics,
      '✨ [THIẾT KẾ MỚI] Trung Tâm Thành Tích VIP Black Titanium:\n• Thẻ Phân Cấp Người Học thiết kế tựa "Thẻ Đen Đặc Quyền" đẳng cấp\n• Hệ thống 6 Huy hiệu Chinh phục Bento Grid thời thượng'
    );

    await sendTelegramPhoto(
      shotOpt3Dark,
      '✨ [THIẾT KẾ MỚI] Chế Độ Nền Tối Deep Obsidian:\n• Độ tương phản đen sâu sang trọng, bảo vệ mắt tuyệt đối\n• Nút chuyển đổi Mặt trời / Mặt trăng mượt mà'
    );

    await sendTelegramPhoto(
      shotOpt3Mobile,
      '📱 [THIẾT KẾ MỚI] Trải Nghiệm Di Động Công Thái Học:\n• Thanh điều hướng dưới đáy (Mobile Bottom Bar) hiện đại\n• Thao tác một tay ngón cái cực kỳ thân thiện'
    );

    console.log('🎉 All luxury redesign photos successfully captured and sent to Telegram!');
  } catch (err) {
    console.error('Error during capture/send:', err);
  } finally {
    await browser.close();
  }
}

run();
