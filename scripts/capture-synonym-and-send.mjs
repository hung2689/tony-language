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
const htmlFile = path.join(outDir, 'synonym_challenge_preview.html');
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

const PORT = 48295;
server.listen(PORT, async () => {
  console.log(`🌐 Server started at http://localhost:${PORT}`);

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1200, height: 1350 },
      deviceScaleFactor: 2,
    });

    await page.goto(`http://localhost:${PORT}/preview`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const screenshotPath = path.join(outDir, 'synonym_challenge_showcase.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    // Also copy to artifact directory
    const artifactPath = path.join(
      'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81',
      'synonym_challenge_showcase.png'
    );
    fs.copyFileSync(screenshotPath, artifactPath);

    await browser.close();
    server.close();

    // Send Telegram Notification & Photo
    const message = `✨ <b>CHẾ ĐỘ HỌC MỚI: SYNONYM CHALLENGE (THÁCH THỨC TỪ ĐỒNG NGHĨA)</b>

🧭 <b>Các tính năng đã hoàn thiện:</b>
1. <b>Thanh chế độ học:</b> Bổ sung <code>Từ đồng nghĩa (AI)</code> đồng bộ cùng các chế độ hiện có trong bộ từ.
2. <b>Question Display:</b>
   • Từ gốc lấy từ Deck hiện tại, ưu tiên các từ yếu / chưa thuộc hoặc cần ôn tập.
   • Hiển thị English Word nổi bật, IPA, Part of Speech, nghĩa tiếng Việt & nút loa phát âm TTS.
   • Không hiển thị trước đáp án đồng nghĩa.
3. <b>Chip Input linh hoạt:</b>
   • Nhập không giới hạn số lượng bằng Enter, dấu phẩy hoặc paste nhiều từ.
   • Hỗ trợ chỉnh sửa hoặc xóa chip dễ dàng.
4. <b>Thẩm định 2 lớp (Dual-layer: Database + Gemini AI):</b>
   • Đối chiếu từ đồng nghĩa trong DB trước, kết hợp AI phân tích ngữ nghĩa sâu.
   • Phân biệt rõ từ đồng nghĩa thực sự và từ chỉ liên quan ngữ cảnh (loại bỏ từ sai bản chất).
5. <b>Kết quả & Gợi ý từ TOEIC:</b>
   • <b>A. Your Answers:</b> Đánh dấu đúng/sai, nghĩa tiếng Việt, nguồn đánh giá và lý do chi tiết.
   • <b>B. Missed Synonyms:</b> Gợi ý từ đồng nghĩa TOEIC thông dụng kèm IPA, nghĩa, ví dụ câu & nút <b>"Lưu vào bộ"</b> (chống trùng lặp).
   • <b>C. Summary:</b> Thống kê tổng số từ, đúng, chưa đúng và từ mới khám phá.
6. <b>Cơ chế Fallback:</b> Tự động fallback sang cơ sở dữ liệu và hiển thị banner cảnh báo minh bạch nếu AI timeout/lỗi.`;

    console.log('📤 Đang gửi ảnh Synonym Challenge sang Telegram...');
    await sendTelegramPhoto(
      screenshotPath,
      '📸 Giao diện Chế độ học Mới: Synonym Challenge (Thách thức từ đồng nghĩa)'
    );
    await sendTelegramNotification(message);
    console.log('✅ Hoàn tất gửi Telegram!');
  } catch (err) {
    console.error('❌ Error during capture/telegram:', err);
    server.close();
  }
});
