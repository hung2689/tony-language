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
const htmlFile = path.join(outDir, 'synonym_page_preview.html');
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

const PORT = 48296;
server.listen(PORT, async () => {
  console.log(`🌐 Server started at http://localhost:${PORT}`);

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1200, height: 1300 },
      deviceScaleFactor: 2,
    });

    await page.goto(`http://localhost:${PORT}/preview`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const screenshotPath = path.join(outDir, 'synonym_page_showcase.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    // Also copy to artifact directory
    const artifactPath = path.join(
      'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81',
      'synonym_page_showcase.png'
    );
    fs.copyFileSync(screenshotPath, artifactPath);

    await browser.close();
    server.close();

    // Send Telegram Notification & Photo
    const message = `✨ <b>CHẾ ĐỘ HỌC ĐỘC LẬP: TRANG SYNONYM CHALLENGE (/decks/:deckId/synonym)</b>

🧭 <b>Trải nghiệm học tập tập trung (Distraction-free) tương đồng với /learn:</b>
1. <b>Trang riêng biệt:</b> Toàn màn hình với hình nền hải đồ vintage, thanh Header với nút [Quay lại], tên bộ từ và [Cài đặt].
2. <b>Thanh Hải trình (Voyage Progress Bar):</b>
   • Con thuyền thám hiểm nhích dần từ <b>⚓ Bến Cảng (0%)</b> đến <b>🏝 Kho Báu (100%)</b> theo thời gian thực.
   • Hiển thị: <code>Tiến độ: 6 / 10 từ thử thách (60%)</code>.
3. <b>Quy tắc kết thúc phiên (Điểm dừng):</b>
   • Mặc định mỗi phiên gồm <b>10 từ</b> (có thể chọn 5, 10, 20 hoặc Tất cả trong Cài đặt).
   • Sau khi hoàn thành đủ số từ (vd: 10/10 từ), thuyền cập bến Kho Báu và chuyển sang <b>Màn hình Tổng kết</b>:
     - 🏆 Tổng số từ hoàn thành & đáp án đúng.
     - 🌟 Số từ vựng TOEIC mới đã lưu vào bộ từ.
     - 🎯 Tỷ lệ chính xác & nút <b>"Vòng tiếp theo"</b> / <b>"Quay lại bộ từ"</b>.
4. <b>Khung giấy da cổ (Parchment Scroll):</b>
   • Họa tiết la bàn cổ + phong cảnh núi non viễn chinh ở các góc.
   • Đầy đủ tính năng chip input linh hoạt, đánh giá 2 lớp (Database + Gemini AI) & gợi ý từ TOEIC.`;

    console.log('📤 Đang gửi ảnh Trang Synonym Challenge sang Telegram...');
    await sendTelegramPhoto(
      screenshotPath,
      '📸 Giao diện Trang riêng độc lập: Synonym Challenge (Thách thức từ đồng nghĩa)'
    );
    await sendTelegramNotification(message);
    console.log('✅ Hoàn tất gửi Telegram!');
  } catch (err) {
    console.error('❌ Error during capture/telegram:', err);
    server.close();
  }
});
