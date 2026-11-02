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
const synonymHtmlFile = path.join(outDir, 'synonym_page_preview.html');
const publicDir = path.join(rootDir, 'frontend/public');
const distDir = path.join(rootDir, 'frontend/dist');

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/synonym') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(synonymHtmlFile, 'utf8'));
    return;
  }

  let assetPath = path.join(publicDir, req.url);
  if (!fs.existsSync(assetPath)) {
    assetPath = path.join(distDir, req.url);
  }

  if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
    const ext = path.extname(assetPath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.css': 'text/css',
      '.js': 'application/javascript',
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
      viewport: { width: 1200, height: 1200 },
      deviceScaleFactor: 2,
    });
    await page.goto(`http://localhost:${PORT}/synonym`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const synonymShot = path.join(outDir, 'synonym_page_showcase.png');
    await page.screenshot({ path: synonymShot, fullPage: true });
    console.log(`📸 Screenshot saved: ${synonymShot}`);

    const artifactSynonym = path.join(
      'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81',
      'synonym_page_showcase.png'
    );
    fs.copyFileSync(synonymShot, artifactSynonym);

    await browser.close();
    server.close();

    const message = `🔊 <b>TINH CHỈNH KÍCH THƯỚC ICON LOA (SYNONYM CHALLENGE)</b>

• <b>Kích thước mới:</b> Đã thu gọn kích thước icon loa từ <code>28px</code> xuống <b><code>20px × 20px</code></b> (tỷ lệ chuẩn, cân đối hoàn hảo bên cạnh chữ tiếng Anh).
• <b>Loa trong Missed Synonyms:</b> Thu nhỏ xuống <b><code>15px × 15px</code></b> vừa vặn trong từng thẻ nhỏ.
• <b>Hiệu ứng:</b> Giữ nguyên độ trong suốt, nét cắt chuẩn và đổ bóng vintage sắc nét.`;

    console.log('📤 Đang gửi ảnh cập nhật loa sang Telegram...');
    await sendTelegramPhoto(
      synonymShot,
      '📸 Icon loa đã được thu nhỏ xuống 20px gọn gàng, tinh tế bên cạnh từ vựng'
    );
    await sendTelegramNotification(message);
    console.log('✅ Hoàn tất gửi Telegram!');
  } catch (err) {
    console.error('❌ Error during capture/telegram:', err);
    server.close();
  }
});
