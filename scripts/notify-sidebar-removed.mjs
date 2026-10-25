import { sendTelegramPhoto, sendTelegramNotification } from './notify-telegram.mjs';

(async () => {
  const photoPath = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81/39-no-sidebar-desktop.png';
  const caption = `✨ *ĐÃ XÓA HOÀN TOÀN THANH SIDEBAR THEO YÊU CẦU!*\n\n` +
    `1. 🎯 **Bỏ toàn bộ Sidebar trái**: Giao diện mở rộng 100% full-width, banner video và thư viện thoáng đãng.\n` +
    `2. 🏷️ **Logo & Thương hiệu**: Chuyển lên góc trái Topbar (\`✦ LEXICON\`), bấm vào để trở về Trang chủ.\n` +
    `3. 👤 **Thông tin tài khoản & Đăng xuất**: Chuyển vào menu Avatar tròn ở góc phải Topbar kèm dropdown thông tin cá nhân và nút Đăng xuất an toàn.\n` +
    `4. 🚀 **Điều hướng linh hoạt**: Thanh Dock macOS ở cạnh dưới màn hình và thanh Bottom Nav trên Mobile vẫn hỗ trợ 1 chạm đến mọi tính năng.`;
  try {
    await sendTelegramPhoto(photoPath, caption);
    console.log('✅ Sent photo notification to Telegram');
  } catch (err) {
    console.log('⚠️ Telegram photo error:', err.message);
    try {
      await sendTelegramNotification(caption);
      console.log('✅ Sent text notification to Telegram');
    } catch (e) {
      console.log('⚠️ Telegram text error:', e.message);
    }
  }
})();
