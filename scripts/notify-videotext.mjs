import { sendTelegramPhoto, sendTelegramNotification } from './notify-telegram.mjs';
import path from 'path';

(async () => {
  const photoPath = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81/25-videotext-preview.png';
  const caption = `🌊 *MagicUI VideoText Đã Tích Hợp Thành Công!*\n\n- Component: \`@/registry/magicui/video-text\`\n- Đã hiển thị động chữ masked video trên Banner Hero Library\n- Responsive SVG Mask, Webkit Masking, Autoplay & Muted loop`;
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
