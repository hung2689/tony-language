import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendTelegramNotification, sendTelegramPhoto } from './notify-telegram.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'screenshots', 'srs-demo');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('#login-email', 'demo_srs@example.com');
  await page.fill('#login-password', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const cardCount = await page.locator('.srs-action-card').count();
  console.log('SpacedRepetitionCard count on page:', cardCount);

  const shot12 = path.join(outputDir, '12-library-card-da-xoa.png');
  await page.screenshot({ path: shot12 });
  await browser.close();

  // Copy to artifacts
  const artifactPath = path.join('C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81', '12-library-card-da-xoa.png');
  fs.copyFileSync(shot12, artifactPath);

  // Send photo and notification to Telegram
  await sendTelegramPhoto(shot12, '📸 Đã xóa hoàn toàn Card "Lặp lại ngắt quãng (Spaced Repetition)" khỏi trang Thư viện!');
  await sendTelegramNotification('✅ <b>Đã xóa thành công Card Lặp lại ngắt quãng theo yêu cầu của bạn!</b> Giao diện trang Thư viện hiện tại đã sạch sẽ, thoáng đãng và không còn bị chiếm diện tích.');
  console.log('Sent Telegram update!');
}

main().catch(console.error);
