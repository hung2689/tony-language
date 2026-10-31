import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sendTelegramNotification, sendTelegramPhoto } from './notify-telegram.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, '../temp_screenshots');

const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Đề xuất Mẫu Phông Chữ Tiếng Việt Chuẩn Concept</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Inter:wght@400;500;600;700;800&family=Lora:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Merriweather:ital,wght@0,400;0,700;0,900;1,400&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #F5E9CE;
      background-image:
        radial-gradient(ellipse at 18% 12%, rgba(255, 249, 235, 0.78) 0%, transparent 55%),
        radial-gradient(ellipse at 82% 88%, rgba(196, 161, 112, 0.28) 0%, transparent 60%),
        linear-gradient(180deg, #F5E9CE 0%, #EFE0BE 50%, #EAD8B3 100%);
      padding: 32px;
      font-family: 'Be Vietnam Pro', sans-serif;
      color: #3B2B1C;
    }
    .header {
      text-align: center;
      margin-bottom: 28px;
    }
    .header h1 {
      font-size: 26px;
      color: #2C1D11;
      margin-bottom: 8px;
      font-weight: 800;
    }
    .header p {
      font-size: 14px;
      color: #6E5336;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .card {
      background: linear-gradient(180deg, rgba(253, 248, 237, 0.98) 0%, rgba(246, 234, 210, 0.98) 100%);
      border: 2px solid #C4A97D;
      border-radius: 16px;
      padding: 22px 24px;
      box-shadow: 0 8px 24px rgba(45, 30, 18, 0.12);
      position: relative;
    }
    .card.recommended {
      border: 2.5px solid #8E5A23;
      box-shadow: 0 10px 30px rgba(142, 90, 35, 0.2);
    }
    .badge-recommend {
      position: absolute;
      top: -12px;
      right: 20px;
      background: #8E5A23;
      color: #FFFDF8;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 12px;
      border-radius: 20px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .card-header-badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 700;
      color: #5A3A1A;
      background: #EFE2C6;
      border: 1px solid #C4A97D;
      border-radius: 6px;
      padding: 3px 10px;
      margin-bottom: 12px;
    }
    .card-title {
      font-size: 21px;
      font-weight: 700;
      color: #2C1D11;
      margin-bottom: 10px;
      line-height: 1.3;
    }
    .card-sub {
      font-size: 13.5px;
      line-height: 1.5;
      margin-bottom: 16px;
      color: #6E5336;
    }
    .preview-box {
      background: #FFFDF8;
      border: 1.5px solid #D9C29E;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .preview-item-title {
      font-size: 17px;
      font-weight: 700;
      color: #2C1D11;
    }
    .preview-item-desc {
      font-size: 13px;
      color: #5C4328;
      line-height: 1.45;
    }
    .preview-meta {
      display: flex;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
    }
    .tag {
      background: #E8F2E2;
      color: #244E1F;
      border: 1px solid #9EC394;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .streak {
      background: #2D1E16;
      color: #FDF8ED;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #C49856;
    }

    /* Option 1: Lora + Be Vietnam Pro */
    .opt-1 .card-title, .opt-1 .preview-item-title {
      font-family: 'Lora', serif;
    }
    .opt-1 .card-sub, .opt-1 .preview-item-desc, .opt-1 .preview-meta {
      font-family: 'Be Vietnam Pro', sans-serif;
    }

    /* Option 2: Merriweather + Be Vietnam Pro */
    .opt-2 .card-title, .opt-2 .preview-item-title {
      font-family: 'Merriweather', serif;
    }
    .opt-2 .card-sub, .opt-2 .preview-item-desc, .opt-2 .preview-meta {
      font-family: 'Be Vietnam Pro', sans-serif;
    }

    /* Option 3: Playfair Display + Inter */
    .opt-3 .card-title, .opt-3 .preview-item-title {
      font-family: 'Playfair Display', serif;
    }
    .opt-3 .card-sub, .opt-3 .preview-item-desc, .opt-3 .preview-meta {
      font-family: 'Inter', sans-serif;
    }

    /* Option 4: Full Plus Jakarta Sans (Hiện đại, siêu êm mắt) */
    .opt-4 .card-title, .opt-4 .preview-item-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-weight: 800;
    }
    .opt-4 .card-sub, .opt-4 .preview-item-desc, .opt-4 .preview-meta {
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📜 BẢNG SO SÁNH PHÔNG CHỮ TIẾNG VIỆT CHUẨN CONCEPT</h1>
    <p>Khắc phục 100% lỗi vỡ dấu tiếng Việt (ử, ỹ, ả, ế, ộ...) – Hài hòa với chất liệu giấy da cổ & mộc bản hải hành</p>
  </div>

  <div class="grid">
    <!-- Mẫu 1: Lora + Be Vietnam Pro (Khuyên dùng số 1) -->
    <div class="card recommended opt-1">
      <span class="badge-recommend">⭐ KHUYÊN DÙNG SỐ 1</span>
      <span class="card-header-badge">MẪU 1: CỔ ĐIỂN QUÝ PHÁI & ÊM MẮT</span>
      <h2 class="card-title">Sử Ký & Bảng Thành Tích Hải Hành</h2>
      <p class="card-sub">
        <strong>Tiêu đề:</strong> Lora (Serif cổ điển sang trọng) • 
        <strong>Nội dung:</strong> Be Vietnam Pro (Siêu mượt, tối ưu riêng cho Tiếng Việt).
      </p>
      <div class="preview-box">
        <div class="preview-item-title">Hạng Thám Hiểm: Đa Ngôn Ngữ Huyền Thoại</div>
        <div class="preview-item-desc">
          Tổng hợp tiến trình thám hiểm, nhật ký học tập và chuỗi ngày rèn luyện trí nhớ SM-2. Khoảng cách ôn tập &gt; 21 ngày.
        </div>
        <div class="preview-meta">
          <span class="tag">✓ Đã thành thạo (45 từ)</span>
          <span class="streak">🔥 14 Ngày Streak</span>
        </div>
      </div>
    </div>

    <!-- Mẫu 2: Merriweather + Be Vietnam Pro -->
    <div class="card opt-2">
      <span class="card-header-badge">MẪU 2: BẢN ĐỒ CỔ & KHẮC GỖ MỘC MẠC</span>
      <h2 class="card-title">Sử Ký & Bảng Thành Tích Hải Hành</h2>
      <p class="card-sub">
        <strong>Tiêu đề:</strong> Merriweather (Nét dày dặn, vững chãi phong cách mộc thư) • 
        <strong>Nội dung:</strong> Be Vietnam Pro.
      </p>
      <div class="preview-box">
        <div class="preview-item-title">Hạng Thám Hiểm: Đa Ngôn Ngữ Huyền Thoại</div>
        <div class="preview-item-desc">
          Tổng hợp tiến trình thám hiểm, nhật ký học tập và chuỗi ngày rèn luyện trí nhớ SM-2. Khoảng cách ôn tập &gt; 21 ngày.
        </div>
        <div class="preview-meta">
          <span class="tag">✓ Đã thành thạo (45 từ)</span>
          <span class="streak">🔥 14 Ngày Streak</span>
        </div>
      </div>
    </div>

    <!-- Mẫu 3: Playfair Display + Inter -->
    <div class="card opt-3">
      <span class="card-header-badge">MẪU 3: TINH TẾ & CAO RÁO THỜI THƯỢNG</span>
      <h2 class="card-title">Sử Ký & Bảng Thành Tích Hải Hành</h2>
      <p class="card-sub">
        <strong>Tiêu đề:</strong> Playfair Display (Nét thanh nét đậm cao ráo) • 
        <strong>Nội dung:</strong> Inter (Rõ nét, công thái học chuẩn quốc tế).
      </p>
      <div class="preview-box">
        <div class="preview-item-title">Hạng Thám Hiểm: Đa Ngôn Ngữ Huyền Thoại</div>
        <div class="preview-item-desc">
          Tổng hợp tiến trình thám hiểm, nhật ký học tập và chuỗi ngày rèn luyện trí nhớ SM-2. Khoảng cách ôn tập &gt; 21 ngày.
        </div>
        <div class="preview-meta">
          <span class="tag">✓ Đã thành thạo (45 từ)</span>
          <span class="streak">🔥 14 Ngày Streak</span>
        </div>
      </div>
    </div>

    <!-- Mẫu 4: Plus Jakarta Sans Toàn Diện -->
    <div class="card opt-4">
      <span class="card-header-badge">MẪU 4: HIỆN ĐẠI TỐI GIẢN & SIÊU RÕ NÉT</span>
      <h2 class="card-title">Sử Ký & Bảng Thành Tích Hải Hành</h2>
      <p class="card-sub">
        <strong>Toàn trang:</strong> Plus Jakarta Sans (Hình học cân đối, đọc văn bản dài và bảng biểu cực kỳ đã mắt).
      </p>
      <div class="preview-box">
        <div class="preview-item-title">Hạng Thám Hiểm: Đa Ngôn Ngữ Huyền Thoại</div>
        <div class="preview-item-desc">
          Tổng hợp tiến trình thám hiểm, nhật ký học tập và chuỗi ngày rèn luyện trí nhớ SM-2. Khoảng cách ôn tập &gt; 21 ngày.
        </div>
        <div class="preview-meta">
          <span class="tag">✓ Đã thành thạo (45 từ)</span>
          <span class="streak">🔥 14 Ngày Streak</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

const tempHtmlPath = path.join(outputDir, 'font_comparison.html');
const screenshotPath = path.join(outputDir, 'font_showcase_options.png');

(async () => {
  console.log('🚀 Generating font comparison showcase...');
  fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await context.newPage();

  try {
    await page.goto('file:///' + tempHtmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
    // wait for Google WebFonts to render smoothly
    await page.waitForTimeout(2000);

    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('📸 Saved font showcase screenshot to:', screenshotPath);

    // Copy to artifact directory
    const artifactDir = 'C:/Users/ASUS/.gemini/antigravity-cli/brain/257ce94f-d6af-402b-a44c-f8fc9c830e89';
    try {
      if (fs.existsSync(artifactDir)) {
        fs.copyFileSync(screenshotPath, path.join(artifactDir, 'font_showcase_options.png'));
      }
    } catch (e) {}

    const msg = `🔤 <b>BÁO CÁO NGUYÊN NHÂN LỖI PHÔNG & 4 MẪU ĐỀ XUẤT THAY THẾ</b>\n\n` +
      `🔍 <b>Tại sao trước đó phông chữ bị lỗi?</b>\n` +
      `• Phông chữ <code>Cinzel</code> trước đây là phông chữ La-tinh phong cách khắc đá phương Tây, <b>KHÔNG hỗ trợ bộ dấu tiếng Việt</b> (Unicode Vietnamese diacritics).\n` +
      `• Khi gặp các ký tự có dấu như: <b>ử, ỹ, ả, ế, ộ, ợ, đ</b>... trình duyệt bị ép nhảy sang phông chữ mặc định (như Times New Roman / Arial) khiến chữ bị giật cục, chân chữ so le, chữ to chữ nhỏ không đều nhau.\n\n` +
      `🎨 <b>Em đã dựng sẵn 4 Mẫu Phông Chữ chuẩn Tiếng Việt 100% để anh chọn:</b>\n` +
      `1️⃣ <b>MẪU 1 (Khuyên dùng số 1):</b> Tiêu đề <b>Lora</b> (Serif cổ điển sang trọng) + Thân chữ <b>Be Vietnam Pro</b> (Nét chữ êm dịu, tối ưu riêng cho Tiếng Việt).\n` +
      `2️⃣ <b>MẪU 2:</b> Tiêu đề <b>Merriweather</b> (Đậm nét, phong cách mộc thư bản đồ cổ) + Thân chữ <b>Be Vietnam Pro</b>.\n` +
      `3️⃣ <b>MẪU 3:</b> Tiêu đề <b>Playfair Display</b> (Nét thanh nét đậm cao ráo, quý phái) + Thân chữ <b>Inter</b>.\n` +
      `4️⃣ <b>MẪU 4:</b> Toàn bộ dùng <b>Plus Jakarta Sans</b> (Hiện đại tối giản, nét tròn đầy, đọc số liệu và từ vựng cực kỳ rõ nét, không bao giờ mỏi mắt).\n\n` +
      `📸 <i>Em đã gửi ảnh chụp so sánh thực tế 4 mẫu trực tiếp bên dưới để anh xem mẫu thực tế nhé!</i>`;

    await sendTelegramNotification(msg);
    await sendTelegramPhoto(screenshotPath, '📸 Bảng so sánh thực tế 4 mẫu phông chữ Tiếng Việt không lỗi dấu');
    console.log('🎉 Sent font comparison to Telegram!');
  } catch (err) {
    console.error('❌ Error generating font comparison:', err);
  } finally {
    await browser.close();
  }
})();
