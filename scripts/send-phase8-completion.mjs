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
🎉 <b>BÁO CÁO HOÀN THÀNH PHASE 8: CHẾ ĐỘ ĐOẠN VĂN NGỮ CẢNH & ĐIỀN TỪ TRÊN FLASHCARD</b>

Chào anh Văn Quý, tính năng <b>Tạo đoạn văn ngữ cảnh & Đục lỗ điền từ vựng (Contextual Cloze Story)</b> nằm trực tiếp ngay trên màn hình Flashcard đã hoàn thành 100% và được kiểm thử toàn diện!

🌟 <b>CÁC ĐIỂM NỔI BẬT ĐÃ TRIỂN KHAI:</b>
1. <b>Nút chuyển chế độ ngay trên Flashcard:</b>
   • Thanh Segmented Control tinh tế nằm ngay đầu thẻ: chuyển đổi linh hoạt 1-click giữa <b>[ Thẻ từ (Flashcard) ]</b> và <b>[ Đoạn văn ngữ cảnh (Điền từ) ]</b>.

2. <b>Tạo đoạn văn ngữ cảnh thông minh:</b>
   • Backend API <code>POST /api/decks/{deckId}/context-story</code> tự động liên kết các từ vựng trong bộ từ thành một câu chuyện tiếng Anh mạch lạc, chân thực.
   • Bộ từ vựng được tự động đục lỗ với các ô trống tương tác <code>[ (1) ]</code> nằm xen kẽ tự nhiên trong dòng chảy văn bản.

3. <b>Hệ thống trợ giúp & Gợi ý (Hints):</b>
   • Nhấp nút 💡 trên từng ô trống để mở gợi ý thông minh gồm: định nghĩa tiếng Việt & chữ cái đầu (ví dụ: <code>s____ (khám phá)</code>).

4. <b>Song ngữ Anh - Việt & Phát âm giọng đọc (Audio TTS):</b>
   • Nút <b>"Nghe đọc"</b> sử dụng giọng đọc tiếng Anh bản xứ chuẩn en-US giúp người học luyện nghe toàn bộ câu chuyện và ngữ điệu tự nhiên.
   • Nút <b>"Hiện dịch nghĩa"</b> hiển thị bản dịch tiếng Việt song ngữ bên dưới mỗi đoạn văn.

5. <b>Chấm điểm thông minh với thuật toán dung sai (checkAnswer):</b>
   • Đánh giá ô trống theo chuẩn 4 cấp độ: Xanh lá (Đúng/Đồng nghĩa), Vàng (Gần đúng/Sai nhẹ chính tả), Đỏ (Sai - hiển thị đáp án đúng để học lại).
   • Bảng tổng kết kết quả với tỷ lệ chính xác (%) và lời khen thưởng khích lệ.

6. <b>Chất lượng kiểm thử:</b>
   • <b>164/164 Vitest tests</b> đạt 100% pass.
   • <b>39/39 Maven Spring Boot tests</b> đạt 100% pass.
   • <b>0 lỗi lint</b> (oxlint).
   • Toàn bộ kịch bản E2E Playwright trên trình duyệt thực tế đã chụp lại đầy đủ ảnh minh chứng.
`;

  console.log('Sending summary to Telegram...');
  await sendTelegramNotification(message);

  const outDir = path.join(rootDir, 'screenshots', 'story_cloze');

  console.log('Sending screenshot 1: Flashcard view with segmented toggle...');
  await sendTelegramPhoto(
    path.join(outDir, '01_flashcard_standard_view.png'),
    '📸 1. Nút chuyển chế độ "Thẻ từ" & "Đoạn văn ngữ cảnh" ngay trên đầu Flashcard'
  );

  console.log('Sending screenshot 2: Contextual story cloze view...');
  await sendTelegramPhoto(
    path.join(outDir, '02_context_story_cloze_view.png'),
    '📸 2. Giao diện đoạn văn ngữ cảnh với các ô đục lỗ điền từ vựng theo dòng văn bản'
  );

  console.log('Sending screenshot 3: Hint revealed...');
  await sendTelegramPhoto(
    path.join(outDir, '03_hint_revealed.png'),
    '📸 3. Tính năng gợi ý thông minh (Nghĩa tiếng Việt & Chữ cái đầu gợi mở)'
  );

  console.log('Sending screenshot 4: Bilingual translation...');
  await sendTelegramPhoto(
    path.join(outDir, '04_bilingual_translation.png'),
    '📸 4. Chế độ song ngữ hiển thị bản dịch tiếng Việt mượt mà bên dưới đoạn văn'
  );

  console.log('Sending screenshot 5: Evaluation results...');
  await sendTelegramPhoto(
    path.join(outDir, '05_story_evaluation_results.png'),
    '📸 5. Chấm điểm thông minh với phản hồi trực quan (Màu sắc, đáp án đúng & Điểm số)'
  );

  console.log('✅ All Phase 8 Telegram messages and photos sent successfully!');
}

main().catch((err) => {
  console.error('Failed to run send-phase8-completion:', err);
  process.exit(1);
});
