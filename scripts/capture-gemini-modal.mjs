import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sendTelegramPhoto } from './notify-telegram.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, '../temp_screenshots/all_popups');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // Login
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('#login-email', 'demo_srs@example.com');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Navigate to library to get a deck ID
    await page.goto('http://localhost:5173/library', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const firstDeckCard = page.locator('.rpg-deck-card').first();
    await firstDeckCard.click();
    await page.waitForTimeout(1000);

    // Click sentence mode
    const sentenceBtn = page.locator('button[data-mode-id="sentence"]').first();
    if (await sentenceBtn.count() > 0) {
      await sentenceBtn.click();
      await page.waitForTimeout(1500);
      const geminiBtn = page.locator('.sentence-gemini-badge, .sentence-byok-btn').first();
      if (await geminiBtn.count() > 0) {
        await geminiBtn.click();
        await page.waitForSelector('.gemini-modal-content, .modal-container', { timeout: 5000 });
        await page.waitForTimeout(600);
        const p = path.join(outputDir, '10_gemini_key_modal.png');
        await page.screenshot({ path: p });
        console.log('📸 Captured 10_gemini_key_modal.png successfully!');
        await sendTelegramPhoto(p, '📜 10. Modal Cấu Hình Khóa Bí Thuật Gemini AI Cá Nhân (Đồng Cổ & Giấy Da)');
      }
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
})();
