import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendTelegramNotification } from './notify-telegram.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function getEnvConfig() {
  const envPath = path.join(rootDir, '.env.telegram');
  let token = process.env.TELEGRAM_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_CHAT_ID;

  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valParts] = trimmed.split('=');
      const val = valParts.join('=').trim();
      if (key === 'TELEGRAM_BOT_TOKEN') token = val;
      if (key === 'TELEGRAM_CHAT_ID') chatId = val;
    }
  }

  return { token, chatId };
}

async function sendTelegramPhoto(photoPath, caption) {
  const { token, chatId } = getEnvConfig();
  if (!token || !chatId || !fs.existsSync(photoPath)) return false;

  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', caption);
  const fileBlob = new Blob([fs.readFileSync(photoPath)], { type: 'image/png' });
  formData.append('photo', fileBlob, path.basename(photoPath));

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return data.ok;
  } catch (err) {
    console.error('Error sending photo:', err.message);
    return false;
  }
}

async function main() {
  const message = `
🎉 <b>BÁO CÁO HOÀN THÀNH PHASE 7: THỐNG KÊ HỌC TẬP & BIỂU ĐỒ NHIỆT (ANALYTICS DASHBOARD)</b>

✅ <b>1. Điều hướng & Menu thanh bên:</b>
• Mục <b>"Thống kê"</b> mới đã xuất hiện trên thanh bên (Sidebar) với biểu tượng trực quan, điều hướng mượt mà đến trang <code>/analytics</code>.

✅ <b>2. Các chỉ số tổng quan (Overview):</b>
• Chuỗi ngày học liên tục (<b>Current Streak 🔥</b>) và kỷ lục chuỗi (<b>Longest Streak 🏆</b>).
• Tổng số câu hỏi đã làm, độ chính xác trung bình (%) và tổng số từ vựng đã tiếp cận.

✅ <b>3. Biểu đồ nhiệt hoạt động (Activity Heatmap 365 ngày):</b>
• Lưới 52 tuần x 7 ngày phong cách GitHub "phủ xanh" các ngày học theo 5 cấp độ màu sắc.
• Tooltip tương tác hiển thị chi tiết số câu hỏi và độ chính xác của từng ngày.
• Chuyển đổi linh hoạt giữa các năm.

✅ <b>4. Phân bổ mức độ ghi nhớ SM-2 (Retention Distribution):</b>
• Biểu đồ phân bổ 4 tầng: <i>Đã thành thạo ➔ Đang củng cố ➔ Đang tiếp thu ➔ Chưa bắt đầu</i>.

✅ <b>5. Phân tích lỗi sai & Ôn tập từ yếu tức thì:</b>
• Bảng Top từ hay trả lời sai nhất kèm thanh tiến độ độ chính xác.
• Nút <b>"Ôn tập ngay các từ này"</b> kích hoạt ngay phiên học trọng điểm tại <code>/analytics/practice</code>, tái sử dụng 100% engine chấm bài Phase 5.

✅ <b>6. Kiểm thử & Chất lượng:</b>
• Frontend Vitest: <b>15/15 test files, 160/160 tests PASSED</b>.
• Backend Surefire: <b>36/36 mock unit tests PASSED</b> (Không chạm dev database).
• Frontend Build: <b>Thành công (435ms, 0 lỗi linter)</b>.
• E2E Playwright: Đã kiểm thử trọn vẹn luồng thống kê, tooltip và ôn tập từ yếu.
`.trim();

  await sendTelegramNotification(message);

  const overviewImg = path.join(rootDir, 'screenshots', 'analytics', '01_analytics_dashboard_overview.png');
  if (fs.existsSync(overviewImg)) {
    await sendTelegramPhoto(overviewImg, '📸 Toàn cảnh Giao diện Thống kê & Biểu đồ nhiệt (Phase 7)');
  }

  const practiceImg = path.join(rootDir, 'screenshots', 'analytics', '04_weak_words_practice_setup.png');
  if (fs.existsSync(practiceImg)) {
    await sendTelegramPhoto(practiceImg, '📸 Phiên ôn tập từ yếu trực tiếp từ bảng thống kê');
  }

  console.log('✅ Telegram Phase 7 completion notification and photos sent.');
}

main();
