import path from 'path';
import { sendTelegramPhoto } from './notify-telegram.mjs';

const artifactDir = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81';
const screenshotPath = path.join(artifactDir, '47-studyplan-darkmode-1440px.png');

(async () => {
  console.log('Sending Dark Mode notification to Telegram...');

  const caption = `🌙 <b>LEXICON — Hoàn thành Nâng cấp Dark Mode Toàn diện</b>\n\n` +
    `🎨 <b>Hệ thống Design Tokens (Deep Slate #0F172A / #1E293B / #334155):</b>\n` +
    `• <b>Chi tiết lộ trình</b>: Tiêu đề rõ ràng (#F1F5F9), 4 thẻ stats đồng nhất (#1E293B), thanh tiến độ xanh dương (#60A5FA), nút Tạm dừng/Cài đặt/Xóa lộ trình (#F87171 viền mảnh) đạt chuẩn WCAG AA.\n` +
    `• <b>Thống kê học tập</b>: Hero banner cấp độ gradient (#1E293B - #273449), huy hiệu đã đạt nền vàng mờ (rgba 251,191,36,0.12), heatmap & cards phân bổ SM-2 rõ ràng.\n` +
    `• <b>Dock & Header</b>: Nền #1E293B backdrop-blur, icon đang chọn phát sáng xanh #60A5FA kèm active dot.\n` +
    `• <b>Chuyển theme mượt mà</b>: Transition 180ms, lưu localStorage, Light Mode giữ nguyên 100%.`;

  await sendTelegramPhoto(screenshotPath, caption);
  console.log('Done!');
})();
