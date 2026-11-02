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
const htmlFile = path.join(outDir, 'incorrect_answer_preview.html');
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

server.listen(48292, async () => {
  console.log('🌐 Server started at http://localhost:48292');

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1200, height: 750 },
      deviceScaleFactor: 2,
    });

    await page.goto('http://localhost:48292/preview', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const screenshotPath = path.join(outDir, 'learn_incorrect_answer_redesign.png');
    // Capture the main parchment card element cleanly
    const cardEl = page.locator('.vintage-question-scroll-wrapper').first();
    if (await cardEl.count() > 0) {
      await cardEl.screenshot({ path: screenshotPath });
    } else {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    await browser.close();
    server.close();

    // Send Telegram Notification & Photo
    const message = `🎯 <b>REDESIGN HOÀN TẤT: MÀN HÌNH KẾT QUẢ TRẢ LỜI SAI (STUDY MODE)</b>

✨ <b>Chi tiết cải tiến theo đúng đặc tả:</b>
1. <b>A. Trạng thái trả lời:</b>
   • Tiêu đề: <code>Chưa đúng</code> màu đỏ đất với icon dấu X đỏ.
2. <b>B. Bạn trả lời:</b>
   • Label: <code>Bạn trả lời:</code>
   • Đáp án sai của người dùng được gạch ngang màu đỏ (ví dụ: <code>~~người làm việc~~</code>).
3. <b>C. Đáp án chính xác:</b>
   • Label: <code>Đáp án:</code>
   • Từ tiếng Anh (<b>SUPERVISOR</b>) là thành phần <b>nổi bật nhất</b> với kích thước lớn nhất trong card, màu xanh rêu đậm typography serif ấn tượng.
   • Giữ nút loa phát âm âm thanh TTS ngay bên cạnh từ tiếng Anh.
4. <b>D. Từ đồng nghĩa:</b>
   • Label: <code>Từ đồng nghĩa:</code>
   • Hiển thị các từ đồng nghĩa trên cùng 1 dòng ngăn cách bởi <code> · </code> (ví dụ: <code>manager · oversee · director</code>).
5. <b>E. Nút tiếp tục:</b>
   • Nút <b>"Tiếp tục"</b> bo tròn màu xanh rêu đậm căn giữa bên dưới card, có hiệu ứng hover & phím tắt <code>↵ Enter</code>.
6. <b>Tối giản & Trực quan:</b>
   • Đã loại bỏ hoàn toàn các thông tin phụ gây rối mắt (ghi chú, giải thích dài, ví dụ mặc định, IPA, POS và ô input readonly thừa).`;

    console.log('📤 Đang gửi ảnh và báo cáo sang Telegram...');
    await sendTelegramPhoto(screenshotPath, '📸 Giao diện mới khi trả lời sai trong Chế độ Học (Adventure Parchment UI)');
    await sendTelegramNotification(message);
    console.log('✅ Hoàn tất gửi Telegram!');
  } catch (err) {
    console.error('❌ Error during capture/telegram:', err);
    server.close();
  }
});
