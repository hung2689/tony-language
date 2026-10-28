import { sendTelegramNotification, sendTelegramDocument } from './notify-telegram.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function run() {
  const planPath = path.join(rootDir, 'PLAN_REDESIGN_LEARN_PAGE.md');
  const caption = '📜 KẾ HOẠCH THIẾT KẾ LẠI CHẾ ĐỘ HỌC (LEARN MODE) — LEXICON PIRATE EXPLORER';

  const msg = `🏴‍☠️ <b>LEXICON — KẾ HOẠCH THIẾT KẾ LẠI CHẾ ĐỘ HỌC (LEARN MODE)</b>

Tôi đã hoàn thành bản kế hoạch chi tiết thiết kế lại trang Học từ vựng (<code>/decks/:deckId/learn</code>) theo đúng chuẩn concept <b>Vintage Pirate Explorer</b> và gửi kèm file tài liệu chi tiết <code>PLAN_REDESIGN_LEARN_PAGE.md</code>.

<b>Các điểm cốt lõi trong kế hoạch:</b>
1. <b>Bố cục toàn màn hình:</b> Độc lập không có sidebar, nền bản đồ hải đồ cổ <code>vintage-map-bg.jpg</code> trải rộng 100vw.
2. <b>Top Header:</b> Nút <code>[ ← Thoát ]</code> kiểu giấy cổ + Tiêu đề ruy băng mạ đồng <code>───◆• 📖 Tên bộ từ •◆───</code>.
3. <b>Màn hình Cài đặt (Learn Setup):</b> Đổi card trắng SaaS hiện đại thành <i>"Bản Lệnh Xuất Bến"</i> trên nền giấy da lớn (<code>profile-paper-bg.png</code>) + 4 thẻ tùy chọn viền da (<code>card-cream.png</code>) + Nút RPG <code>[ ⚔ BẮT ĐẦU HẢI TRÌNH ]</code> xanh rêu viền nổi.
4. <b>Màn hình Câu hỏi & Phản hồi:</b> Thanh tiến độ "Hải trình thuyền buồm" + Thẻ câu hỏi giấy da cổ 4 góc minh họa + Dấu triện sáp mộc bản xanh/đỏ phản hồi Đúng/Sai.
5. <b>Màn hình Báo công:</b> Huân chương XP vàng đồng + Bảng thống kê hải trình thám hiểm.

Xin mời bạn xem và duyệt file đính kèm!`;

  console.log('Sending message to Telegram...');
  await sendTelegramNotification(msg);

  console.log('Sending document to Telegram...');
  await sendTelegramDocument(planPath, caption);

  console.log('🎉 Successfully sent plan to Telegram!');
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
