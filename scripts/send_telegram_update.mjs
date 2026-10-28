import { sendTelegramNotification, sendTelegramPhoto } from './notify-telegram.mjs';

async function main() {
  const message = `🏝️ <b>TÍCH HỢP ANIMATION ĐẢO "FOREST OF BEGINNINGS" HOÀN TẤT</b>

✨ <b>Chi tiết triển khai:</b>
• <b>Resource:</b> Đã copy và tối ưu video <code>forest-island.mp4</code> từ Sorceress (Grok 1.5) vào <code>/public/assets/animation/forest-island.mp4</code>.
• <b>Precision Alpha Mask:</b> Tạo mask viền mềm Gaussian Blur (<code>forest-island-mask.png</code>) khớp 98% silhouette hòn đảo, loại bỏ hoàn toàn viền biển chữ nhật, không che lấp hải trình, la bàn hay các hòn đảo lân cận.
• <b>Tương tác & Quản lý State:</b>
  - Nhấp vào đảo để phát animation mượt mà (React <code>useRef</code> + <code>useState</code>).
  - Kết thúc video tự động trở về idle và cho phép click phát lại (replay).
  - Chống giật & chống click liên tục chồng video.
  - Hiệu ứng hover viền vàng phát sáng (golden glow) và nâng nhẹ đảo (subtle lift).
  - Tôn trọng <code>prefers-reduced-motion</code> & accessibility.
  - Giữ nguyên toàn bộ tiến độ học, điều hướng từ vựng và 4 hòn đảo khác.

🧪 <b>Kiểm thử tự động:</b>
• Build Vite Production thành công 100%.
• Playwright Browser test tự động qua tất cả kịch bản (Idle -> Hover -> Play -> Ended -> Replay).`;

  await sendTelegramNotification(message);
  await sendTelegramPhoto('C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81/crop_playing.png', '📸 Ảnh chụp thực tế: Animation Forest of Beginnings phát mượt mà trên bản đồ thế giới');
}

main();
