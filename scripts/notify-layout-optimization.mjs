import { sendTelegramPhoto, sendTelegramNotification } from './notify-telegram.mjs';

(async () => {
  const photoPath = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81/44-studyplan-1440px.png';
  const caption = `✨ *TỐI ƯU GIAO DIỆN "CHI TIẾT LỘ TRÌNH" & "THỐNG KÊ HỌC TẬP" THÀNH CÔNG!*\n\n` +
    `1. 📐 **Container chính**: Mở rộng từ 1040px lên 1400px, cân đối, lấp đầy không gian trống hai bên.\n` +
    `2. 🎯 **Trang Chi Tiết Lộ Trình**:\n` +
    `   - Banner phiên học hôm nay giảm từ 210px xuống ~140px, vòng tròn tiến độ gọn gàng (72px).\n` +
    `   - Bố cục 2 cột: Cột trái (65%) gồm Tiến độ tổng thể + Danh sách bộ từ; Cột phải (35%) gồm 4 thẻ thống kê xếp 2x2 STICKY cuộn theo trang.\n` +
    `   - Empty state danh sách bộ từ thu gọn < 160px.\n` +
    `3. 📊 **Trang Thống Kê Học Tập**:\n` +
    `   - Banner Cấp độ học viên trải rộng 100%, giảm chiều cao còn ~90px.\n` +
    `   - Huy hiệu thành tích chuyển từ 2 cột sang lưới 3 CỘT đều đặn.\n` +
    `   - Các card thống kê bên dưới trải đều cân bằng, không còn khoảng trống thừa.\n` +
    `4. 📱 **Responsive**: Hoàn hảo trên cả 1920px, 1440px, 1024px, 768px và 390px.`;
  try {
    await sendTelegramPhoto(photoPath, caption);
    console.log('✅ Sent photo notification to Telegram');
  } catch (err) {
    console.log('⚠️ Telegram photo error:', err.message);
  }
})();
