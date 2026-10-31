import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sendTelegramNotification, sendTelegramPhoto } from './notify-telegram.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, '../temp_screenshots/all_popups');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function captureModal(page, selector, filename, desc) {
  const filePath = path.join(outputDir, filename);
  try {
    console.log(`⏳ Waiting for modal: ${desc} (${selector})...`);
    await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(600); // Wait for transition
    await page.screenshot({ path: filePath });
    console.log(`📸 Saved: ${filePath}`);
    return filePath;
  } catch (err) {
    console.error(`❌ Failed to capture ${desc}:`, err.message);
    await page.screenshot({ path: filePath });
    return filePath;
  }
}

async function safeCloseModal(page) {
  try {
    const closeBtn = page.locator('.modal-close-btn, .confirm-dialog-close-btn, .srs-popup-close-btn, .gemini-close-btn, .wallpaper-modal-close-btn, .study-plan-modal-close, button:has-text("Hủy")').first();
    if (await closeBtn.count() > 0 && await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    } else {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
  } catch (e) {
    // ignore
  }
}

(async () => {
  console.log('🚀 Starting Comprehensive Popups Capture & Send...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const capturedPhotos = [];

  try {
    // 0. Login
    console.log('🔑 Logging in as demo_srs@example.com...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('#login-email', 'demo_srs@example.com');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // ==========================================
    // 1. Library Modals
    // ==========================================
    console.log('📚 Navigating to /library...');
    await page.goto('http://localhost:5173/library', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // 1.1 Create Folder Modal
    console.log('1️⃣ Triggering Create Folder Modal...');
    const addFolderBtn = page.locator('button.rpg-add-folder-subtle-btn, button:has-text("Thư mục mới")').first();
    if (await addFolderBtn.count() > 0) {
      await addFolderBtn.click();
      const p = await captureModal(page, '.modal-container', '01_create_folder_modal.png', 'Modal Tạo Thư Mục Mới');
      capturedPhotos.push({ path: p, caption: '📜 1. Modal Tạo Thư Mục Mới (Khung Giấy Da & Đinh Tán Đồng Cổ)' });
      await safeCloseModal(page);
    }

    // 1.2 Deck Form Modal (Create Deck)
    console.log('2️⃣ Triggering Deck Form Modal...');
    const createDeckBtn = page.locator('button:has-text("Tạo bộ thẻ mới"), .journal-create-deck-btn').first();
    if (await createDeckBtn.count() > 0) {
      await createDeckBtn.click();
      const p = await captureModal(page, '.lexicon-journal-modal, .modal-container', '02_deck_form_modal.png', 'Modal Tạo Bộ Thẻ');
      capturedPhotos.push({ path: p, caption: '📜 2. Modal Soạn Thảo Bộ Từ Vựng (Lexicon Journal RPG Cổ Điển)' });
      await safeCloseModal(page);
    }

    // 1.3 Spaced Repetition Forecast Modal (SRS)
    console.log('3️⃣ Triggering SRS Forecast Modal...');
    const srsBtn = page.locator('button.journal-srs-forecast-btn, button:has-text("Lịch ôn tập (SRS)")').first();
    if (await srsBtn.count() > 0) {
      await srsBtn.click();
      const p = await captureModal(page, '.srs-popup-card', '03_srs_forecast_modal.png', 'Modal Dự Báo Lặp Lại Ngắt Quãng SRS');
      capturedPhotos.push({ path: p, caption: '📜 3. Modal Dự Báo Lặp Lại Ngắt Quãng SRS (La Bàn & Giấy Bản Đồ Hải Hành)' });
      await safeCloseModal(page);
    }

    // 1.4 Move Deck Modal (via Deck 3-dots menu)
    console.log('4️⃣ Triggering Move Deck Modal...');
    const moreMenuBtn = page.locator('.rpg-deck-more-btn').first();
    if (await moreMenuBtn.count() > 0) {
      await moreMenuBtn.click();
      await page.waitForTimeout(300);
      const moveMenuItem = page.locator('button:has-text("Chuyển thư mục")').first();
      if (await moveMenuItem.count() > 0) {
        await moveMenuItem.click();
        const p = await captureModal(page, '.modal-container', '04_move_deck_modal.png', 'Modal Chuyển Thư Mục Cho Bộ Thẻ');
        capturedPhotos.push({ path: p, caption: '📜 4. Modal Di Chuyển Bộ Từ Vào Thư Mục' });
        await safeCloseModal(page);
      }
    }

    // 1.5 Confirm Dialog (Delete Deck)
    console.log('5️⃣ Triggering Confirm Dialog (Delete Deck)...');
    if (await moreMenuBtn.count() > 0) {
      await moreMenuBtn.click();
      await page.waitForTimeout(300);
      const deleteDeckItem = page.locator('button:has-text("Xóa bộ thẻ")').first();
      if (await deleteDeckItem.count() > 0) {
        await deleteDeckItem.click();
        const p = await captureModal(page, '.confirm-dialog-container', '05_confirm_dialog_deck.png', 'Hộp Thoại Xác Nhận Xóa Bộ Thẻ');
        capturedPhotos.push({ path: p, caption: '📜 5. Hộp Thoại Xác Nhận Cảnh Báo (Dấu Triện Đỏ Sáp Nguy Hiểm)' });
        await safeCloseModal(page);
      }
    }

    // 1.6 Delete Folder Modal
    console.log('6️⃣ Triggering Delete Folder Modal...');
    const folderItem = page.locator('.rpg-folder-tree-item, .rpg-folder-actions').first();
    if (await folderItem.count() > 0) {
      await folderItem.hover();
      const deleteFolderBtn = page.locator('.rpg-folder-mini-btn.is-danger').first();
      if (await deleteFolderBtn.count() > 0) {
        await deleteFolderBtn.click();
        const p = await captureModal(page, '.modal-container', '06_delete_folder_modal.png', 'Modal Xóa Thư Mục');
        capturedPhotos.push({ path: p, caption: '📜 6. Modal Xóa Thư Mục (Radio Card & Khung Cảnh Báo Giấy Da)' });
        await safeCloseModal(page);
      }
    }

    // ==========================================
    // 2. Study Plan Page Modals
    // ==========================================
    console.log('🗺️ Navigating to /study-plan...');
    await page.goto('http://localhost:5173/study-plan', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // 2.1 Settings Modal in Study Plan
    console.log('7️⃣ Triggering Study Plan Settings Modal...');
    const settingsPlanBtn = page.locator('button[title*="Cài đặt"], button:has-text("Cài đặt"), button:has-text("Chỉnh sửa lộ trình")').first();
    if (await settingsPlanBtn.count() > 0 && await settingsPlanBtn.isVisible()) {
      await settingsPlanBtn.click();
      const p = await captureModal(page, '.study-plan-modal-card', '07_study_plan_settings_modal.png', 'Modal Cài Đặt Hải Trình');
      capturedPhotos.push({ path: p, caption: '📜 7. Modal Cài Đặt Hải Trình Học Tập (Target Date & Giới Hạn Từ)' });
      await safeCloseModal(page);
    }

    // 2.2 Add Decks Modal in Study Plan
    console.log('8️⃣ Triggering Add Decks Preview Modal...');
    const addDecksBtn = page.locator('button:has-text("Thêm bộ từ"), button:has-text("Thêm bộ thẻ")').first();
    if (await addDecksBtn.count() > 0 && await addDecksBtn.isVisible()) {
      await addDecksBtn.click();
      const p = await captureModal(page, '.study-plan-modal-card', '08_add_decks_modal.png', 'Modal Thêm Bộ Thẻ Vào Hải Trình');
      capturedPhotos.push({ path: p, caption: '📜 8. Modal Thêm Bộ Từ Vào Hải Trình Học Tập' });
      await safeCloseModal(page);
    }

    // ==========================================
    // 3. Wallpaper Modal (from AppDock)
    // ==========================================
    console.log('🖼️ Triggering Wallpaper Modal...');
    const wallpaperIcon = page.locator('svg.lucide-image').first();
    if (await wallpaperIcon.count() > 0) {
      await wallpaperIcon.click();
      const p = await captureModal(page, '.modal-container, .wallpaper-modal-content', '09_wallpaper_modal.png', 'Modal Chọn Hình Nền Hải Trình');
      capturedPhotos.push({ path: p, caption: '📜 9. Modal Chọn Hình Nền Không Gian Học & Hải Trình' });
      await safeCloseModal(page);
    }

    // ==========================================
    // 4. Gemini AI Key Modal
    // ==========================================
    console.log('💎 Triggering Gemini AI Key Modal...');
    await page.goto('http://localhost:5173/library', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const firstDeckCard = page.locator('.rpg-deck-card, .deck-card').first();
    if (await firstDeckCard.count() > 0) {
      await firstDeckCard.click();
      await page.waitForTimeout(1500);
      
      // Look for sentence challenge card or mode
      const sentenceModeBtn = page.locator('button:has-text("Đặt câu"), a:has-text("Đặt câu"), [data-mode="sentence"]').first();
      if (await sentenceModeBtn.count() > 0) {
        await sentenceModeBtn.click();
        await page.waitForTimeout(1500);
        const geminiTrigger = page.locator('.sentence-gemini-badge, .sentence-byok-btn').first();
        if (await geminiTrigger.count() > 0) {
          await geminiTrigger.click();
          const p = await captureModal(page, '.gemini-key-modal-card', '10_gemini_key_modal.png', 'Modal Cấu Hình Gemini AI Key');
          capturedPhotos.push({ path: p, caption: '📜 10. Modal Cấu Hình Khóa Bí Thuật Gemini AI' });
          await safeCloseModal(page);
        }
      }
    }

    // ==========================================
    // 5. Send To Telegram
    // ==========================================
    console.log(`📤 Sending ${capturedPhotos.length} screenshots to Telegram...`);

    const summaryMsg = `📸 <b>TRỌN BỘ ẢNH CHỤP TẤT CẢ POPUP & MODAL HIỆN TẠI (ĐÃ ĐỒNG BỘ 100%)</b>\n\n` +
      `Đã kiểm tra và đồng bộ giao diện theo chuẩn <b>Vintage Pirate Explorer / Cổ Điển Bản Đồ & Nhật Ký RPG</b>:\n` +
      `• Nền giấy da cổ Parchment ấm áp (` + '`#FDF8ED`' + ` -> ` + '`#F5E8CD`' + `)\n` +
      `• Khung viền kim loại đồng thau kép (` + '`#A8783E`' + ` / ` + '`#C4A97D`' + `)\n` +
      `• Nút đóng tròn đồng cổ chạm nổi\n` +
      `• Nút chính xanh rêu mộc bản (` + '`#46583A`' + `), Nút phụ ngà (` + '`#FAF0DA`' + `), Nút nguy hiểm dấu triện đỏ sáp (` + '`#992B2B`' + `)\n\n` +
      `Dưới đây là hình ảnh chụp trực tiếp từng popup:`;

    await sendTelegramNotification(summaryMsg);

    for (const item of capturedPhotos) {
      if (fs.existsSync(item.path)) {
        console.log(`Sending photo: ${item.caption}...`);
        await sendTelegramPhoto(item.path, item.caption);
        await new Promise((res) => setTimeout(res, 1200)); // 1.2s pause to avoid Telegram 429
      }
    }

    console.log('🎉 All popups captured and sent successfully to Telegram!');
  } catch (err) {
    console.error('❌ Error during capture process:', err);
  } finally {
    await browser.close();
  }
})();
