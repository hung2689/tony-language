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

async function sendTelegramDocument(filePath, caption) {
  const { token, chatId } = getEnvConfig();
  if (!token || !chatId || !fs.existsSync(filePath)) return false;

  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', caption);
  const fileBlob = new Blob([fs.readFileSync(filePath)], { type: 'text/markdown' });
  formData.append('document', fileBlob, path.basename(filePath));

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return data.ok;
  } catch (err) {
    console.error('Error sending document:', err.message);
    return false;
  }
}

async function main() {
  const planPath = path.join(rootDir, 'scratch', 'phase7_plan.md');

  const message = `
📋 <b>KẾ HOẠCH TRIỂN KHAI PHASE 7: THỐNG KÊ HỌC TẬP CHUYÊN SÂU & BIỂU ĐỒ NHIỆT (ANALYTICS DASHBOARD)</b>

Mình đã xây dựng kế hoạch chi tiết cho <b>Hướng 3</b> theo yêu cầu của bạn:

1️⃣ <b>Biểu đồ nhiệt hoạt động (Activity Heatmap):</b>
• Ma trận 52 tuần x 7 ngày phong cách GitHub "phủ xanh" các ngày học.
• Tooltip xem chi tiết: số từ đã ôn, độ chính xác từng ngày.
• Đếm chuỗi ngày học liên tục (Current Streak) & Kỷ lục chuỗi (Longest Streak).

2️⃣ <b>Phân bổ mức độ ghi nhớ SM-2 (Retention Levels):</b>
• Thống kê 4 cấp độ: Chưa học ➔ Đang tiếp thu ➔ Đang củng cố ➔ Đã thành thạo.

3️⃣ <b>Phân tích lỗi sai & Ôn tập từ yếu tức thì:</b>
• Bảng Top 10 từ bạn hay sai nhất.
• Nút <b>"Ôn tập ngay các từ này"</b> gom nhanh danh sách từ yếu thành phiên học trọng điểm ngay tại chỗ.

4️⃣ <b>Tối ưu & Cam kết:</b>
• Thiết kế SVG / CSS Grid siêu nhẹ (dưới 50ms), không dùng thư viện nặng.
• 100% không chạy test ghi dữ liệu vào dev database.

<i>File chi tiết <b>phase7_plan.md</b> đã được gửi đính kèm bên dưới. Bạn xem và confirm giúp mình nhé!</i>
`.trim();

  await sendTelegramNotification(message);
  await sendTelegramDocument(planPath, '📄 File kế hoạch: phase7_plan.md');
  console.log('✅ Sent plan message and document to Telegram.');
}

main();
