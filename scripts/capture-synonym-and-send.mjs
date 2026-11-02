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
const dropdownHtmlFile = path.join(outDir, 'deck_dropdown_preview.html');
const publicDir = path.join(rootDir, 'frontend/public');
const distDir = path.join(rootDir, 'frontend/dist');

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/synonym') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(synonymHtmlFile, 'utf8'));
    return;
  }

  if (req.url === '/dropdown') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(dropdownHtmlFile, 'utf8'));
    return;
  }

  // Serve static assets from frontend/public or frontend/dist
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

    // 1. Capture Synonym Page Showcase
    const page1 = await browser.newPage({
      viewport: { width: 1200, height: 1250 },
      deviceScaleFactor: 2,
    });
    await page1.goto(`http://localhost:${PORT}/synonym`, { waitUntil: 'networkidle' });
    await page1.waitForTimeout(800);
    const synonymShot = path.join(outDir, 'synonym_page_showcase.png');
    await page1.screenshot({ path: synonymShot, fullPage: true });
    console.log(`📸 Screenshot saved: ${synonymShot}`);

    // Copy to artifact dir
    const artifactSynonym = path.join(
      'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81',
      'synonym_page_showcase.png'
    );
    fs.copyFileSync(synonymShot, artifactSynonym);
    await page1.close();

    // 2. Capture Deck Dropdown Menu Showcase
    const page2 = await browser.newPage({
      viewport: { width: 1200, height: 700 },
      deviceScaleFactor: 2,
    });
    await page2.goto(`http://localhost:${PORT}/dropdown`, { waitUntil: 'networkidle' });
    await page2.waitForTimeout(800);
    const dropdownShot = path.join(outDir, 'deck_dropdown_showcase.png');
    await page2.screenshot({ path: dropdownShot, fullPage: true });
    console.log(`📸 Screenshot saved: ${dropdownShot}`);

    const artifactDropdown = path.join(
      'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81',
      'deck_dropdown_showcase.png'
    );
    fs.copyFileSync(dropdownShot, artifactDropdown);
    await page2.close();

    await browser.close();
    server.close();

    // Send Telegram Notifications
    const message = `🛠 <b>CẬP NHẬT GIAO DIỆN & FIX LỖI LAYOUT MENU 3 CHẤM</b>

1. 🔊 <b>Đổi icon loa sang ảnh loa tách nền vintage chính thống:</b>
   • Thay thế nút tròn cũ bằng ảnh <code>/assets/flashcard/flashcard-sound.png</code> (ảnh loa vintage tách nền đồng bộ với trang Flashcard).
   • Áp dụng cho cả loa phát âm từ gốc và loa phát âm ở thẻ từ gợi ý (Missed Synonyms).

2. 🧹 <b>Loại bỏ dòng chữ hướng dẫn rườm rà:</b>
   • Đã xóa toàn bộ khối hướng dẫn <i>"Hãy nhập càng nhiều từ đồng nghĩa của từ trên càng tốt..."</i> giúp màn hình thoáng đãng, tập trung tối đa vào từ vựng gốc.

3. 🗂 <b>Sửa triệt để lỗi menu 3 chấm hiện phía sau thẻ học:</b>
   • <b>Nguyên nhân:</b> <code>.vintage-deck-header-row</code> không có stacking context cao hơn <code>.vintage-study-mode-bar</code> (chứa các thẻ có <code>filter: drop-shadow</code>).
   • <b>Khắc phục:</b> Đặt <code>position: relative; z-index: 100;</code> cho Header Row và <code>z-index: 1000;</code> cho <code>.vintage-dropdown-menu</code>, đảm bảo Menu luôn nổi hoàn toàn trên các thẻ học.`;

    console.log('📤 Đang gửi ảnh cập nhật giao diện sang Telegram...');
    await sendTelegramPhoto(
      synonymShot,
      '📸 Giao diện Synonym Challenge mới: Icon loa tách nền vintage & bỏ dòng hướng dẫn thừa'
    );
    await sendTelegramPhoto(
      dropdownShot,
      '📸 Giao diện Menu 3 chấm (Deck Detail): Đã nổi hoàn toàn phía trên các thẻ học (z-index fix)'
    );
    await sendTelegramNotification(message);
    console.log('✅ Hoàn tất gửi Telegram!');
  } catch (err) {
    console.error('❌ Error during capture/telegram:', err);
    server.close();
  }
});
