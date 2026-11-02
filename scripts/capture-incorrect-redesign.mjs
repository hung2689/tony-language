import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import React from '../frontend/node_modules/react/index.js';
import { renderToStaticMarkup } from '../frontend/node_modules/react-dom/server.node.js';
import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import LearnFeedback from '../frontend/src/features/learn/LearnFeedback.jsx';
import { sendTelegramNotification, sendTelegramPhoto } from './notify-telegram.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Read CSS files to inject
const distAssetsDir = path.join(rootDir, 'frontend/dist/assets');
let compiledCss = '';
if (fs.existsSync(distAssetsDir)) {
  const cssFiles = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith('.css'));
  if (cssFiles.length > 0) {
    compiledCss = fs.readFileSync(path.join(distAssetsDir, cssFiles[0]), 'utf8');
  }
}

// Mock feedback data matching user's specific example
const mockFeedback = {
  result: 'wrong',
  userAnswer: 'người làm việc',
  correctAnswer: 'supervisor',
  card: {
    id: 101,
    term: 'supervisor',
    definition: 'người giám sát',
    partOfSpeech: 'noun',
    pronunciation: 'ˈsuːpərvaɪzər',
    example: 'The supervisor approved the request.',
    synonyms: ['manager', 'oversee', 'director'],
  },
  direction: 'VI_TO_EN',
  override: false,
};

const feedbackHtml = renderToStaticMarkup(
  React.createElement(LearnFeedback, {
    deck: { name: 'GROUP 1 — BUSINESS, MANAGEMENT & CORPORATE STRATEGY' },
    feedback: mockFeedback,
    sessionStats: { totalWords: 48, masteredWords: 15 },
    distinctCardCount: 16,
    options: { autoSpeak: false },
    onNextQuestion: () => {},
    onOverride: () => {},
    onExit: () => {},
  })
);

const fullPageHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Learn Incorrect Answer Redesign</title>
  <style>
    ${compiledCss}
    body {
      margin: 0;
      padding: 0;
      background: #F3E6C8 url('/assets/flashcard/vintage-map-bg.jpg') no-repeat center top / cover fixed;
      font-family: 'Merriweather', 'Lora', serif;
    }
  </style>
</head>
<body>
  ${feedbackHtml}
</body>
</html>`;

// Start lightweight HTTP server to serve assets correctly
const publicDir = path.join(rootDir, 'frontend/public');
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/preview') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fullPageHtml);
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

server.listen(48291, async () => {
  console.log('🌐 Server started at http://localhost:48291');

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1200, height: 800 },
      deviceScaleFactor: 2,
    });

    await page.goto('http://localhost:48291/preview', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const screenshotPath = path.join(outDir, 'learn_incorrect_answer_redesign.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    await browser.close();
    server.close();

    // Send Telegram Notification & Photo
    const message = `🎯 <b>REDESIGN HOÀN TẤT: GIAO DIỆN KẾT QUẢ TRẢ LỜI SAI (STUDY MODE)</b>

✨ <b>Các cải tiến theo đúng yêu cầu:</b>
1. <b>Trạng thái trả lời (A):</b> Tiêu đề <i>"Chưa đúng"</i> màu đỏ đất với icon dấu X nổi bật, tinh tế.
2. <b>Bạn trả lời (B):</b> Label <i>"Bạn trả lời:"</i>, đáp án sai được gạch ngang màu đỏ (<code>~~người làm việc~~</code>).
3. <b>Đáp án chính xác (C):</b>
   • Từ tiếng Anh (<b>SUPERVISOR</b>) có kích thước lớn nhất trong card, màu xanh rêu đậm typography serif ấn tượng.
   • Giữ nút loa phát âm âm thanh thực tế ngay cạnh từ.
4. <b>Từ đồng nghĩa (D):</b> Label <i>"Từ đồng nghĩa:"</i>, hiển thị trên cùng 1 dòng ngăn cách bởi <code> · </code> (ví dụ: <code>manager · oversee · director</code>).
5. <b>Nút tiếp tục (E):</b> Nút <b>"Tiếp tục"</b> bo tròn màu xanh rêu đậm căn giữa bên dưới card, có hiệu ứng hover & phím tắt <code>↵ Enter</code>.
6. <b>Tối giản & Trực quan:</b> Đã loại bỏ triệt để các thông tin phụ gây rối mắt (ghi chú, câu ví dụ, IPA, POS và ô input thừa).`;

    console.log('📤 Đang gửi ảnh và báo cáo sang Telegram...');
    await sendTelegramPhoto(screenshotPath, '📸 Giao diện mới khi trả lời sai trong Chế độ Học (Adventure Parchment UI)');
    await sendTelegramNotification(message);
    console.log('✅ Hoàn tất gửi Telegram!');
  } catch (err) {
    console.error('❌ Error during capture/telegram:', err);
    server.close();
  }
});
