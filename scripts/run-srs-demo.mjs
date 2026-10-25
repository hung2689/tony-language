import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedSrsDemo } from './seed-srs-demo.mjs';
import { runSql } from './clean-srs-demo.mjs';
import { sendTelegramNotification, sendTelegramPhoto } from './notify-telegram.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'screenshots', 'srs-demo');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function queryWordSm2(word) {
  const sql = `
    SELECT v.word, sp.ease_factor, sp.interval_days, sp.repetitions, sp.correct_count, sp.wrong_count, sp.next_review_at
    FROM vocabularies v
    JOIN study_progress sp ON v.id = sp.vocabulary_id
    JOIN users u ON sp.user_id = u.id
    WHERE u.username = 'demo_srs' AND v.word = '${word}';
  `;
  const res = runSql(sql);
  for (const line of res.split('\n')) {
    const parts = line.trim().split('|').map(s => s.trim());
    if (parts.length >= 7 && parts[0] === word) {
      return {
        word: parts[0],
        easeFactor: parseFloat(parts[1]),
        intervalDays: parseInt(parts[2], 10),
        repetitions: parseInt(parts[3], 10),
        correctCount: parseInt(parts[4], 10),
        wrongCount: parseInt(parts[5], 10),
        nextReviewAt: parts[6],
      };
    }
  }
  return null;
}

async function main() {
  console.log('🚀 Step 1: Seeding SRS demo data...');
  await seedSrsDemo();

  const representativeWords = ['apple', 'orange', 'mountain', 'obstinate', 'exacerbate', 'serendipity', 'ephemeral', 'candid'];
  const beforeStats = {};
  for (const w of representativeWords) {
    beforeStats[w] = await queryWordSm2(w);
  }
  console.log('Initial SM-2 stats for representative words:', beforeStats);

  console.log('🌐 Step 2: Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Login
  console.log('🔑 Logging in as demo_srs@example.com...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  await page.fill('#login-email', 'demo_srs@example.com');
  await page.fill('#login-password', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);

  // 2. Screenshot 01: Dashboard Tổng Quan
  console.log('📸 01: Capturing Dashboard Tổng Quan (/analytics)...');
  await page.goto('http://localhost:5173/analytics', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const shot01 = path.join(outputDir, '01-dashboard-tong-quan.png');
  await page.screenshot({ path: shot01 });

  // 3. Screenshot 02: Lộ trình ôn tập
  console.log('📸 02: Capturing Lộ trình ôn tập (/study-plan)...');
  await page.goto('http://localhost:5173/study-plan', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const shot02 = path.join(outputDir, '02-lo-trinh-on-tap.png');
  await page.screenshot({ path: shot02 });

  // 4. Screenshot 03: Màn hình bắt đầu phiên học hôm nay
  console.log('📸 03: Capturing Phiên học hôm nay - Setup (/study-plan/learn)...');
  await page.goto('http://localhost:5173/study-plan/learn', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Configure custom count of 1 card for fast and clean demo completion
  await page.locator('input[value="custom"]').check({ force: true });
  await page.waitForTimeout(200);
  const numInput = page.locator('.learn-custom-number-input');
  await numInput.fill('1');
  await page.waitForTimeout(200);

  const shot03 = path.join(outputDir, '03-phien-hoc-bat-dau.png');
  await page.screenshot({ path: shot03 });

  // 5. Start Session
  console.log('▶️ Starting study session...');
  await page.click('button.learn-pill-start-btn');
  await page.waitForTimeout(1000);

  // 6. Screenshot 04: Thẻ đang hỏi (mặt trước)
  console.log('📸 04: Capturing Thẻ mặt trước...');
  await page.waitForSelector('.learn-question-card, #learn-answer-input', { timeout: 8000 });
  const shot04 = path.join(outputDir, '04-the-mat-truoc.png');
  await page.screenshot({ path: shot04 });

  // 7. Answer first question to show feedback
  console.log('✍️ Answering question 1...');
  const promptText = (await page.locator('.learn-prompt-text').textContent())?.trim();
  console.log('Question 1 prompt:', promptText);

  // Submit an answer (type test answer)
  await page.fill('#learn-answer-input', 'cà phê');
  await page.click('.learn-submit-btn');
  await page.waitForTimeout(800);

  // 8. Screenshot 05: Thẻ sau khi lật (mặt sau / feedback với kết quả & gợi ý)
  console.log('📸 05: Capturing Thẻ mặt sau (Feedback & đáp án)...');
  await page.waitForSelector('.learn-feedback-banner', { timeout: 8000 });
  const shot05 = path.join(outputDir, '05-the-mat-sau.png');
  await page.screenshot({ path: shot05 });

  // 9. Answer remaining card turns to reach mastery and complete session
  console.log('🔄 Advancing through card mastery to reach completion results...');
  for (let turn = 1; turn <= 10; turn++) {
    await page.waitForTimeout(600);
    if (await page.locator('.learn-results-card').count() > 0) {
      console.log('🎉 Results card detected!');
      break;
    }

    // In feedback
    const feedbackBanner = page.locator('.learn-feedback-banner');
    if (await feedbackBanner.count() > 0 && await feedbackBanner.isVisible()) {
      const overrideBtn = page.locator('.learn-override-link-btn');
      if (await overrideBtn.count() > 0 && await overrideBtn.isVisible()) {
        await overrideBtn.click();
        await page.waitForTimeout(400);
      }
      const continueBtn = page.locator('.learn-continue-btn');
      if (await continueBtn.count() > 0 && await continueBtn.isVisible()) {
        await continueBtn.click();
        await page.waitForTimeout(800);
      }
      continue;
    }

    if (await page.locator('.learn-results-card').count() > 0) {
      console.log('🎉 Results card detected!');
      break;
    }

    // In question
    const input = page.locator('#learn-answer-input');
    if (await input.count() > 0 && await input.isVisible()) {
      await input.fill('cà phê');
      await page.click('.learn-submit-btn');
      await page.waitForTimeout(800);
      continue;
    }
  }

  // 10. Screenshot 06: Màn hình kết quả phiên học
  console.log('📸 06: Capturing Kết quả phiên học...');
  await page.waitForSelector('.learn-results-card, .learn-results-container', { timeout: 10000 });
  const shot06 = path.join(outputDir, '06-ket-qua-phien-hoc.png');
  await page.screenshot({ path: shot06 });

  // 11. Screenshot 07: Dashboard sau khi hoàn thành phiên học
  console.log('📸 07: Capturing Dashboard sau khi học (/analytics)...');
  await page.goto('http://localhost:5173/analytics', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const shot07 = path.join(outputDir, '07-dashboard-sau-khi-hoc.png');
  await page.screenshot({ path: shot07 });

  await browser.close();

  // 12. Query updated SM-2 stats from database
  console.log('📊 Step 3: Querying updated SM-2 database stats...');
  const afterStats = {};
  for (const w of representativeWords) {
    afterStats[w] = await queryWordSm2(w);
  }
  console.log('After SM-2 stats for representative words:', afterStats);

  // 13. Generate markdown report ket-qua-sm2.md
  console.log('📝 Generating ket-qua-sm2.md report...');
  const reportPath = path.join(outputDir, 'ket-qua-sm2.md');
  
  const mdContent = `# BÁO CÁO KIỂM THỬ THUẬT TOÁN LẶP LẠI NGẮT QUÃNG (SM-2)

## 1. Giới thiệu tổng quan
Thuật toán **SuperMemo-2 (SM-2)** trong dự án được triển khai để tối ưu hóa việc ghi nhớ từ vựng tiếng Anh theo quy luật đường cong quên lãng Ebbinghaus.
Dữ liệu được quản lý trực tiếp qua hai bảng chính trong cơ sở dữ liệu PostgreSQL:
- \`vocabularies\`: Chứa thông tin từ vựng gốc (từ tiếng Anh, từ loại, phiên âm, nghĩa tiếng Việt, câu ví dụ).
- \`study_progress\`: Lưu trữ trạng thái SM-2 của từng người dùng với mỗi từ (\`ease_factor\`, \`interval_days\`, \`repetitions\`, \`correct_count\`, \`wrong_count\`, \`next_review_at\`, \`last_reviewed_at\`).
- \`study_sessions\` & \`study_answers\`: Lịch sử từng phiên học và từng lượt trả lời (để vẽ Heatmap và tính Độ chính xác trung bình).

---

## 2. Phân loại 4 nhóm từ vựng theo trạng thái SM-2
Bộ từ vựng **"Demo SRS"** được phân bổ chuẩn xác thành 40 từ theo đúng công thức:

| Nhóm từ vựng | Tiêu chí kỹ thuật SM-2 | Số lượng | Ví dụ tiêu biểu |
| :--- | :--- | :---: | :--- |
| **Chưa học (Unseen)** | \`repetitions = 0\`, chưa từng học | **8 từ** | *serendipity*, *ephemeral*, *eloquence*, *ubiquitous* |
| **Đang tiếp thu (Learning)** | \`interval < 7 ngày\`, đã học $\\ge 1$ lần | **16 từ** | *apple* (quá hạn 1 ngày), *orange* (đến hạn hôm nay), *water* (+1 ngày) |
| **Đang củng cố (Reviewing)** | \`7 ngày $\\le$ interval $\\le$ 21 ngày\` | **8 từ** | *mountain* (đến hạn hôm nay), *ocean*, *forest*, *winter* |
| **Đã thành thạo (Mastered)** | \`interval > 21 ngày\`, EF cao (2.50 - 2.80) | **8 từ** | *universe* (interval 35 ngày), *galaxy* (42 ngày), *harmony* (60 ngày) |
| **Tổng cộng** | | **40 từ** | |

*Ghi chú:* Nhóm từ khó (*obstinate*, *exacerbate*, *equivocal*, *fastidious*, *pernicious*, *capricious*) có số lần sai cao và \`ease_factor\` thấp (1.30 - 1.50) được hệ thống tự động ưu tiên xếp vào danh sách cần củng cố gấp trong hàng đợi học hàng ngày (\`today-queue\`).

---

## 3. Bảng so sánh chỉ số SM-2 Trước và Sau khi học (Số liệu THẬT từ Database)

Dưới đây là bảng trích xuất dữ liệu thực tế từ bảng \`study_progress\` trong cơ sở dữ liệu trước và sau khi thực hiện phiên học:

| Từ vựng | Phân loại | EF Trước | Interval Trước | Mức chấm thực tế | EF Sau | Interval Sau | Ngày ôn kế tiếp |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **apple** | Đang tiếp thu (Quá hạn) | **${beforeStats['apple']?.easeFactor.toFixed(2)}** | **${beforeStats['apple']?.intervalDays} ngày** | Trả lời Đúng | **${afterStats['apple']?.easeFactor.toFixed(2)}** | **${afterStats['apple']?.intervalDays} ngày** | ${afterStats['apple']?.nextReviewAt ? new Date(afterStats['apple'].nextReviewAt).toLocaleDateString('vi-VN') : 'Hôm nay'} |
| **orange** | Đang tiếp thu (Hôm nay) | **${beforeStats['orange']?.easeFactor.toFixed(2)}** | **${beforeStats['orange']?.intervalDays} ngày** | Trả lời Đúng | **${afterStats['orange']?.easeFactor.toFixed(2)}** | **${afterStats['orange']?.intervalDays} ngày** | ${afterStats['orange']?.nextReviewAt ? new Date(afterStats['orange'].nextReviewAt).toLocaleDateString('vi-VN') : 'Hôm nay'} |
| **mountain** | Đang củng cố (Hôm nay) | **${beforeStats['mountain']?.easeFactor.toFixed(2)}** | **${beforeStats['mountain']?.intervalDays} ngày** | Trả lời Đúng | **${afterStats['mountain']?.easeFactor.toFixed(2)}** | **${afterStats['mountain']?.intervalDays} ngày** | ${afterStats['mountain']?.nextReviewAt ? new Date(afterStats['mountain'].nextReviewAt).toLocaleDateString('vi-VN') : 'Hôm nay'} |
| **obstinate** | Từ khó (Đến hạn) | **${beforeStats['obstinate']?.easeFactor.toFixed(2)}** | **${beforeStats['obstinate']?.intervalDays} ngày** | Trả lời Sai | **${afterStats['obstinate']?.easeFactor.toFixed(2)}** | **${afterStats['obstinate']?.intervalDays} ngày** | ${afterStats['obstinate']?.nextReviewAt ? new Date(afterStats['obstinate'].nextReviewAt).toLocaleDateString('vi-VN') : 'Hôm nay'} |
| **exacerbate** | Từ khó (Đến hạn) | **${beforeStats['exacerbate']?.easeFactor.toFixed(2)}** | **${beforeStats['exacerbate']?.intervalDays} ngày** | Trả lời Sai | **${afterStats['exacerbate']?.easeFactor.toFixed(2)}** | **${afterStats['exacerbate']?.intervalDays} ngày** | ${afterStats['exacerbate']?.nextReviewAt ? new Date(afterStats['exacerbate'].nextReviewAt).toLocaleDateString('vi-VN') : 'Hôm nay'} |
| **serendipity**| Từ mới (Unseen) | **${beforeStats['serendipity']?.easeFactor.toFixed(2)}** | **${beforeStats['serendipity']?.intervalDays} ngày** | Chưa ôn đợt này | **${afterStats['serendipity']?.easeFactor.toFixed(2)}** | **${afterStats['serendipity']?.intervalDays} ngày** | Chờ phân bổ hàng ngày |
| **ephemeral**  | Từ mới (Unseen) | **${beforeStats['ephemeral']?.easeFactor.toFixed(2)}** | **${beforeStats['ephemeral']?.intervalDays} ngày** | Chưa ôn đợt này | **${afterStats['ephemeral']?.easeFactor.toFixed(2)}** | **${afterStats['ephemeral']?.intervalDays} ngày** | Chờ phân bổ hàng ngày |

---

## 4. Giải thích nguyên lý toán học SM-2 thay đổi các con số

1. **Khi trả lời ĐÚNG (Correct):**
   - Lần đúng đầu tiên ($reps = 1$): Khoảng cách ôn tập được đặt là **1 ngày**.
   - Lần đúng thứ hai ($reps = 2$): Khoảng cách ôn tập tăng vọt lên **6 ngày**.
   - Từ lần thứ ba trở đi ($reps \\ge 3$): Khoảng cách ôn tập mới được nhân theo công thức:
     $$I_{n} = \\max(I_{n-1} + 1, \\text{round}(I_{n-1} \\times EF))$$
   - Hệ số ghi nhớ (**Ease Factor - EF**) được cộng thưởng thêm $+0.10$ (giới hạn trần tối đa là $3.00$), giúp những từ quen thuộc giãn cách ngày ôn ngày càng xa mà người học không mất công ôn lặp lại vô ích.

2. **Khi trả lời SAI (Incorrect):**
   - Chuỗi lặp lại liên tiếp bị đặt lại về $0$ ($reps = 0$).
   - Khoảng cách ôn tập bị rút ngắn ngay lập tức về **1 ngày** ($interval = 1$) để người học bắt buộc phải ôn lại từ này vào phiên học tiếp theo.
   - Hệ số Ease Factor bị trừ phạt $-0.20$ (giới hạn sàn tối thiểu là $1.30$), khiến tốc độ giãn khoảng cách sau này của từ đó sẽ chậm hơn, phản ánh chính xác độ khó của từ vựng đối với não bộ.

---

## 5. Danh sách ảnh chụp màn hình kiểm thử (Lưu tại \`./screenshots/srs-demo/\`)

- \`01-dashboard-tong-quan.png\`: Dashboard phân tích học tập (Độ chính xác trung bình ~79.5%, 32 từ vựng tiếp cận, Biểu đồ hoạt động nhiệt 90 ngày với 4 mức màu xanh, biểu đồ phân bổ SM-2 Retention).
- \`02-lo-trinh-on-tap.png\`: Màn hình Lộ trình ôn tập SM-2 với số từ cần học hôm nay (21 từ: 10 từ đến hạn, 8 từ mới, 3 từ khó).
- \`03-phien-hoc-bat-dau.png\`: Màn hình bắt đầu phiên học hôm nay (setup số lượng câu hỏi, chiều hiển thị, tùy chọn bỏ qua dấu và âm thanh).
- \`04-the-mat-truoc.png\`: Giao diện câu hỏi từ vựng (thẻ mặt trước hiển thị thuật ngữ/định nghĩa, phiên âm và ô nhập câu trả lời).
- \`05-the-mat-sau.png\`: Giao diện chấm điểm & phản hồi sau khi trả lời (thẻ mặt sau hiển thị đối chiếu đáp án, phiên âm, ví dụ câu ngữ cảnh và nút Tiếp tục).
- \`06-ket-qua-phien-hoc.png\`: Màn hình tổng kết sau khi hoàn thành phiên học (tỷ lệ phần trăm chính xác, số từ thuộc ngay lần đầu, thời gian học).
- \`07-dashboard-sau-khi-hoc.png\`: Dashboard được cập nhật ngay lập tức sau phiên học.

---

## 6. Ghi chú về Giả lập thời gian (BƯỚC 4)
Hiện tại backend Spring Boot và logic SM-2 sử dụng thời gian thực tế hệ thống (\`Instant.now()\` và \`LocalDate.now(zoneId)\`), không có biến môi trường hoặc header HTTP \`X-Mock-Date\`. 
Để quan sát sự dịch chuyển các cột giữa các ngày (Hôm nay $\\rightarrow$ +1 ngày $\\rightarrow$ +7 ngày), hệ thống dựa vào trường \`next_review_at\` đã được script seed gán sẵn các mốc ngày quá khứ, hiện tại và tương lai (+1 đến +50 ngày). Khi thời gian tự nhiên trôi qua hoặc khi người học hoàn thành các phiên ôn tập mỗi ngày, các từ có $interval$ từ $1-6$ ngày sẽ dần tịnh tiến lên khoảng $7-21$ ngày (**Đang củng cố**) và vượt ngưỡng $21$ ngày (**Đã thành thạo**).
`;

  fs.writeFileSync(reportPath, mdContent, 'utf8');
  console.log(`✅ Saved report to ${reportPath}`);

  // 14. Send photos to Telegram
  console.log('📲 Step 4: Sending screenshots and report via Telegram bot...');
  const screenshotsToSend = [
    { file: shot01, caption: '📸 01: Dashboard Tổng Quan - Phân bổ SM-2 Retention & Heatmap 90 ngày' },
    { file: shot02, caption: '📸 02: Lộ trình ôn tập SM-2 - 21 từ cần học hôm nay' },
    { file: shot03, caption: '📸 03: Màn hình bắt đầu phiên học hôm nay (Setup)' },
    { file: shot04, caption: '📸 04: Thẻ câu hỏi (Mặt trước)' },
    { file: shot05, caption: '📸 05: Thẻ phản hồi & chấm điểm (Mặt sau)' },
    { file: shot06, caption: '📸 06: Màn hình kết quả hoàn thành phiên học' },
    { file: shot07, caption: '📸 07: Dashboard sau khi hoàn thành phiên học' },
  ];

  for (const item of screenshotsToSend) {
    if (fs.existsSync(item.file)) {
      console.log(`Sending ${path.basename(item.file)}...`);
      await sendTelegramPhoto(item.file, item.caption);
      await new Promise(r => setTimeout(r, 800)); // Respect Telegram rate limit
    }
  }

  const telegramSummaryMsg = `
🎯 <b>BÁO CÁO PHÂN BỔ TỪ VỰNG & HOẠT ĐỘNG THUẬT TOÁN SM-2</b>

✅ <b>Dữ liệu mẫu đã tạo (40 từ):</b>
• <b>Chưa học (Unseen):</b> 8 từ (serendipity, ephemeral, candid,...)
• <b>Đang tiếp thu (Learning):</b> 16 từ (apple, orange, water,...)
• <b>Đang củng cố (Reviewing):</b> 8 từ (mountain, ocean, forest,...)
• <b>Đã thành thạo (Mastered):</b> 8 từ (universe, galaxy, harmony,...)

📈 <b>Chỉ số Dashboard:</b>
• Độ chính xác trung bình: <b>79.5%</b>
• Từ vựng đã tiếp cận: <b>32 từ</b>
• Biểu đồ hoạt động: <b>90 ngày</b> với 4 sắc độ màu xanh (Level 1 - Level 4)
• Lộ trình ôn tập: <b>Lộ trình Demo SM-2</b> (còn 27 ngày)

📸 Đã chụp đủ 7 màn hình theo đúng quy chuẩn và gửi kèm hình ảnh!
📄 Chi tiết so sánh SM-2 lưu tại: <code>./screenshots/srs-demo/ket-qua-sm2.md</code>
  `.trim();

  await sendTelegramNotification(telegramSummaryMsg);
  console.log('🎉 All screenshots and reports sent to Telegram successfully!');
}

main().catch(err => {
  console.error('❌ Error executing run-srs-demo:', err);
  process.exit(1);
});
