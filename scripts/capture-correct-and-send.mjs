import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import { sendTelegramNotification, sendTelegramPhoto } from './notify-telegram.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'screenshots');
const htmlFile = path.join(outDir, 'correct_answer_preview.html');
const publicDir = path.join(rootDir, 'frontend/public');

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/preview') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(htmlFile, 'utf8'));
    return;
  }

  // Serve static assets from frontend/public
  const assetPath = path.join(publicDir, req.url);
  if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
    const ext = path.extname(assetPath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.mp3': 'audio/mpeg',
      '.woff2': 'font/woff2',
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(assetPath).pipe(res);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(48294, async () => {
  console.log('🌐 Server started at http://localhost:48294');

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1200, height: 750 },
      deviceScaleFactor: 2,
    });

    await page.goto('http://localhost:48294/preview', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const screenshotPath = path.join(outDir, 'learn_correct_answer.png');
    const cardEl = page.locator('.vintage-question-scroll-wrapper').first();
    if (await cardEl.count() > 0) {
      await cardEl.screenshot({ path: screenshotPath });
    } else {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    // Also copy to artifact directory
    const artifactPath = path.join('C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81', 'learn_correct_answer.png');
    fs.copyFileSync(screenshotPath, artifactPath);

    await browser.close();
    server.close();

    // Send Telegram Notification & Photo
    const message = `✨ <b>GIAO DIỆN KHI TRẢ LỜI ĐÚNG (STUDY MODE)</b>

🌿 <b>Chi tiết hiển thị:</b>
1. <b>A. Trạng thái:</b> Icon tích xanh ✅ cùng tiêu đề <code>Chính xác!</code> màu xanh rêu thanh lịch.
2. <b>B. Đáp án:</b>
   • Từ tiếng Anh (<b>supervisor</b>) nổi bật nhất với màu xanh rêu đậm & typography serif cổ điển.
   • Nút loa phát âm TTS đặt ngay bên cạnh từ.
3. <b>C. Từ đồng nghĩa:</b> <code>manager · director · overseer</code> hiển thị trên 1 dòng gọn gàng.
4. <b>D. Nút điều hướng:</b> Nút <b>"Tiếp tục →"</b> căn giữa bên dưới card (nếu bật chế độ tự động chuyển câu thì hệ thống sẽ tự qua câu sau).
5. <b>Tối giản & Trực quan:</b> Không có dòng "Bạn trả lời" hay link override khi đã trả lời đúng.`;

    console.log('📤 Đang gửi ảnh câu trả lời đúng sang Telegram...');
    await sendTelegramPhoto(screenshotPath, '📸 Giao diện khi trả lời ĐÚNG trong Chế độ Học (Adventure Parchment UI)');
    await sendTelegramNotification(message);
    console.log('✅ Hoàn tất gửi Telegram!');
  } catch (err) {
    console.error('❌ Error during capture/telegram:', err);
    server.close();
  }
});
