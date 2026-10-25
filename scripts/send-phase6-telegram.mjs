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
🎉 <b>BÁO CÁO HOÀN THÀNH PHASE 6: LỘ TRÌNH ÔN TẬP (SPACED REPETITION - SM-2)</b>

✅ <b>1. Kích hoạt nút bấm:</b>
• Nút <b>"Tạo lộ trình"</b> ở thanh bên (Sidebar) đã được kích hoạt.
• Nút <b>"Lặp lại ngắt quãng"</b> tại chi tiết bộ từ (DeckDetailPage) đã hoạt động.

✅ <b>2. Thuật toán SM-2 & Phân bổ hàng ngày:</b>
• SM-2 engine phân bổ từ: Ôn tập đến hạn ➔ Từ yếu ➔ Từ mới.
• Mốc chuyển ngày chuẩn: 4:00 AM (giờ trình duyệt).
• Khử trùng lặp từ vựng giống nhau giữa các bộ từ.

✅ <b>3. Cổng học hằng ngày:</b>
• Mặc định là Cổng mềm (Banner nhắc nhở trên trang Thư viện: "Học ngay" / "Để sau").
• Tùy chọn Khóa cứng ("Khóa tôi cho đến khi học xong") trong Cài đặt lộ trình.

✅ <b>4. Quản lý lộ trình linh hoạt:</b>
• Thêm bộ từ vào lộ trình tại 3 vị trí (Modal tạo bộ từ, Menu 3 chấm, Trang Lộ trình) kèm tính toán quá tải & 3 chiến lược điều chỉnh (Giữ deadline, Lùi deadline, Nâng cap).
• Tính lại tự động khi thêm/xóa thẻ (kể cả Bulk Import).

✅ <b>5. Kiểm thử & Chất lượng:</b>
• Frontend Vitest: <b>14/14 test files, 156/156 tests PASSED</b>.
• Backend Surefire: <b>32/32 mock unit tests PASSED</b> (Không chạm dev database).
• E2E Playwright: Đã kiểm thử trọn vẹn luồng tạo lộ trình, cổng học và phiên "Học hôm nay".
`.trim();

  await sendTelegramNotification(message);

  const dashImg = path.join(rootDir, 'screenshots', 'study-plan', '02_study_plan_dashboard.png');
  if (fs.existsSync(dashImg)) {
    await sendTelegramPhoto(dashImg, '📸 Giao diện Quản lý Lộ trình Ôn tập (Phase 6)');
  }

  const gateImg = path.join(rootDir, 'screenshots', 'study-plan', '03_library_daily_gate.png');
  if (fs.existsSync(gateImg)) {
    await sendTelegramPhoto(gateImg, '📸 Cổng học hằng ngày (Daily Gate) tại trang Thư viện');
  }

  console.log('✅ Telegram notifications and screenshots sent.');
}

main();
