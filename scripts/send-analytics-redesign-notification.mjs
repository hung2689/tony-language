import path from 'path';
import { sendTelegramPhoto, sendTelegramNotification } from './notify-telegram.mjs';

const artifactDir = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81';
const screenshotPath = path.join(artifactDir, '46-analytics-redesigned-1440px.png');

(async () => {
  console.log('Sending redesigned Analytics notification to Telegram...');

  const caption = `📊 <b>LEXICON — Hoàn thành Redesign Giao diện Thống kê Học tập</b>\n\n` +
    `🎨 <b>Thiết kế Monochrome & Điểm nhấn theo ảnh mẫu:</b>\n` +
    `• <b>Learner Tier Hero Banner</b>: Squircle chứa viên kim cương 3D đa diện rực sáng, badge CẤP 4 tím, vector ngọn núi đa giác với cờ đỉnh núi, pill Streak 7 ngày đen tuyền.\n` +
    `• <b>Huy hiệu thành tích (4/6)</b>: Grid 3x2 đều đặn, 6 huy hiệu bo tròn với icon màu sắc (🌟, 🔥, ⚡, 🎯, 👑, 🚀), thanh tiến độ và tag trạng thái ✓ Đã đạt.\n` +
    `• <b>Hai cột song song cân đối</b>:\n` +
    `   - Cột trái: Biểu đồ hoạt động heatmap (Th1-Th12, T2-CN, cell xanh lá).\n` +
    `   - Cột phải: Phân bổ SM-2 Retention (3 card hàng 1: Đã thành thạo, Đang củng cố, Đang tiếp thu; 1 card dài hàng 2: Chưa bắt đầu).\n` +
    `• <b>Phía dưới</b>: Bảng từ vựng yếu & dock điều hướng nổi mượt mà.`;

  await sendTelegramPhoto(screenshotPath, caption);
  console.log('Done!');
})();
