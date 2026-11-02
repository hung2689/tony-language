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
      viewport: { width: 1200, height: 1350 },
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
    const message = `🎯 <b>FIX LỖI: ĐÁNH GIÁ TỪ ĐỒNG NGHĨA & HỆ THỐNG 3 TRẠNG THÁI (SYNONYM CHALLENGE)</b>

🔍 <b>Nguyên nhân gốc rễ (Root Cause):</b>
1. <b>Lệch tên trường Boolean của Jackson:</b> Getter Java <code>isValid()</code> mặc định được Jackson serialize thành JSON key <code>"valid"</code> thay vì <code>"isValid"</code>. Frontend đọc <code>item.isValid</code> nhận <code>undefined</code> (falsy) nên hiển thị toàn bộ icon X đỏ và gạch ngang từ dù <code>validCount = 1</code>!
2. <b>Thiếu phân loại sắc thái nghĩa:</b> Hệ thống cũ chỉ có nhị phân (true/false), chưa phân biệt giữa từ đồng nghĩa trực tiếp, từ đồng nghĩa theo ngữ cảnh và từ chỉ liên quan chủ đề.

🛠 <b>Các giải pháp đã triển khai:</b>
1. <b>Hệ thống 3 trạng thái chuẩn (TASK 2):</b>
   • <code>EXACT_SYNONYM</code>: Đồng nghĩa chính xác (Hợp lệ - Icon ✓ Xanh lá - Không gạch ngang).
   • <code>CONTEXTUAL_SYNONYM</code>: Đồng nghĩa theo ngữ cảnh (Hợp lệ - Icon ? Vàng hổ phách - Có giải thích ngữ cảnh chi tiết).
   • <code>NOT_SYNONYM</code>: Không phải đồng nghĩa (Chưa đúng - Icon ✗ Đỏ - Gạch ngang từ).
2. <b>Jackson Annotation (@JsonProperty):</b>
   • Serialize đầy đủ cả <code>isValid</code>, <code>valid</code> và <code>status</code>.
3. <b>Thống nhất ánh xạ Frontend (TASK 3):</b>
   • Sử dụng duy nhất module <code>synonymEvaluationUtils.js</code> để tính toán số lượng hợp lệ/chưa đúng trên Header, Session Stats và hiển thị từng thẻ từ.
4. <b>Logging đầy đủ (TASK 5):</b>
   • Ghi log chi tiết Original word, User submitted words, Raw Gemini response, Parsed evaluation và Final API response (bảo mật tuyệt đối, không log API key).
5. <b>Bảo đảm test bao phủ 8 test cases bắt buộc (TASK 4):</b>
   • ITEM -> Product (Valid) | Object (Contextual) | Employee (Invalid)
   • CUSTOMER -> Client (Valid) | Consumer (Contextual) | Employee (Invalid)
   • IMPORTANT -> Significant (Valid) | Crucial (Valid)`;

    console.log('📤 Đang gửi ảnh cập nhật đánh giá sang Telegram...');
    await sendTelegramPhoto(
      screenshotPath,
      '📸 Kết quả cập nhật đánh giá 3 trạng thái: Exact, Contextual & Invalid'
    );
    await sendTelegramNotification(message);
    console.log('✅ Hoàn tất gửi Telegram!');
  } catch (err) {
    console.error('❌ Error during capture/telegram:', err);
    server.close();
  }
});
