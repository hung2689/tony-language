# KẾ HOẠCH THIẾT KẾ LẠI CHẾ ĐỘ HỌC (LEARN MODE) — LEXICON
## PHONG CÁCH VINTAGE PIRATE EXPLORER / ANTIQUE CARTOGRAPHY

---

## 1. TỔNG QUAN HIỆN TRẠNG & VẤN ĐỀ CỦA GIAO DIỆN HIỆN TẠI

Dựa trên ảnh chụp màn hình thực tế tại URL `http://localhost:5173/decks/:deckId/learn`:
- **Nền trang:** Màu trắng phẳng (`#ffffff`), lạc lõng hoàn toàn so với phong cách Bản đồ Hải tặc cổ của Thư viện và Flashcard.
- **Top Header:** Nút `[ ← Thoát ]` là nút phẳng tối giản, tiêu đề là chuỗi text ID trơ trọi (ví dụ `116932`), thiếu ruy băng và trang trí đồng bộ.
- **Card chính (Cài đặt bài tập):** Khung card trắng phẳng bo góc hiện đại của ứng dụng SaaS văn phòng, các biểu tượng generic (`FileEdit`, `Clock`, `ArrowLeftRight`, `GraduationCap`, `Settings`) và các radio/checkbox xám xịt thông thường.
- **Nút hành động:** Nút đen đơn điệu `[ ▶ Bắt đầu học ]` không mang lại cảm giác hứng khởi của một chuyến thám hiểm ngôn ngữ.
- **Các màn hình trong phiên học (Câu hỏi, Phản hồi Đúng/Sai, Tổng kết):** Toàn bộ các bước tiếp theo cũng đang dùng phong cách phẳng hiện đại, cần được tân trang đồng bộ để tạo thành một trải nghiệm liền mạch từ lúc chọn thiết lập đến khi hoàn thành bài học.

---

## 2. Ý TƯỞNG THIẾT KẾ: "HẢI TRÌNH CHINH PHỤC TỪ VỰNG" (THE VOYAGE OF MASTERY)

Biến toàn bộ trang Học từ vựng thành **"Bản Lệnh Xuất Bến"** (Voyage Preparation) và **"Nhật Ký Thám Hiểm"** (Explorer's Quiz Journal):
- Không gian toàn màn hình (Full-width, không có sidebar bên trái) tương tự trang Flashcard vừa tối ưu.
- Nền trang là hải đồ cổ toàn cảnh với hoa văn la bàn và đường vĩ tuyến (`vintage-map-bg.jpg`).
- Bảng thiết lập được đặt trên một cuộn giấy da cổ lớn với dấu triện mạ đồng và nẹp gỗ hai đầu.

---

## 3. CHI TIẾT THIẾT KẾ TỪNG MÀN HÌNH

### 3.1. Màn hình Cài đặt học tập (Learn Setup — Bản Lệnh Xuất Bến)
- **Top Header cổ điển:**
  - **Bên trái:** Nút `[ ← Quay lại / Thoát ]` tái sử dụng asset nút giấy cổ [`button-back.png`](file:///d:/Pham%20Duy%20Hung/PROJECT/LanguageLearning/frontend/public/assets/flashcard/button-back.png).
  - **Chính giữa:** Tiêu đề tên bộ từ vựng nằm giữa hai dải hoa văn đồng cổ `───◆• 📖 Tên bộ từ •◆───` cùng icon sách [`decor_vocabulary_book.png`](file:///d:/Pham%20Duy%20Hung/PROJECT/LanguageLearning/frontend/public/assets/decor_icon/decor_vocabulary_book.png).
  - **Bên phải:** Huy hiệu tổng số từ trong bộ trên nền giấy nhỏ.
- **Khung chứa chính (Voyage Parchment Panel):**
  - Tái sử dụng nền giấy da cổ sắc nét [`profile-paper-bg.png`](file:///d:/Pham%20Duy%20Hung/PROJECT/LanguageLearning/frontend/public/assets/profile/profile-paper-bg.png) hoặc [`spaced-repetition-paper.png`](file:///d:/Pham%20Duy%20Hung/PROJECT/LanguageLearning/frontend/public/assets/popup/spaced-repetition-paper.png).
  - Góc trên bên trái: La bàn hải hành trang trí [`popup_compass_rose.png`](file:///d:/Pham%20Duy%20Hung/PROJECT/LanguageLearning/frontend/public/assets/popup/popup_compass_rose.png).
  - Tiêu đề bản lệnh: *"Cài đặt Hải trình Học tập"* phông chữ Serif cổ điển (*Merriweather / Playfair Display*), kèm phụ đề màu nâu sẫm: *"Gõ câu trả lời chính xác để chinh phục hải trình. Các từ chưa thuộc sẽ được lặp lại đến khi thành thạo."*
- **Lưới 4 Thẻ Thiết lập (2x2 Grid):**
  - Mỗi thẻ thiết lập là một tấm thẻ giấy da viền chỉ nâu sẫm (tái sử dụng cấu trúc viền của [`card-cream.png`](file:///d:/Pham%20Duy%20Hung/PROJECT/LanguageLearning/frontend/public/assets/flashcard/card-cream.png)).
  - **Thẻ 1: Số lượng câu hỏi:** Icon đồng hồ cát / la bàn, lựa chọn `Tất cả (N từ)` hoặc `Tùy chọn số câu`.
  - **Thẻ 2: Thứ tự câu hỏi:** Icon bản đồ xáo trộn, lựa chọn `Ngẫu nhiên hải trình` hoặc `Theo thứ tự bộ từ`.
  - **Thẻ 3: Hướng học tập:** Icon mỏ neo / sách mở, lựa chọn `Việt → Anh`, `Anh → Việt`, hoặc `Trộn cả hai hướng`.
  - **Thẻ 4: Tùy chọn bổ trợ:** Checkbox thiết kế kiểu dấu triện khắc gỗ: `Tự đọc phát âm`, `Âm thanh hiệu ứng`, `Bỏ qua dấu tiếng Việt`, `Chấp nhận từ đồng nghĩa`.
- **Nút Bắt đầu học tập (Launch Voyage Button):**
  - Thay thế nút đen hiện đại bằng nút dạng thỏi gỗ mạ đồng hoặc ruy băng xanh rêu phong cách Game RPG hải tặc:
    `[ ⚔ BẮT ĐẦU HẢI TRÌNH HỌC TẬP ]` (Nền xanh rêu `#46583A`, chữ vàng kem `#FAF0DA`, viền khắc nổi vàng đồng `#A8783E`, đổ bóng da thuộc).

---

### 3.2. Màn hình Câu hỏi (Learn Question — Khảo Nghiệm Tri Thức)
- **Thanh Tiến độ Hải trình (Voyage Progress Bar):**
  - Thay thế thanh 10 ô vuông xám hiện đại bằng một hải trình đứt nét nối giữa hai hòn đảo:
    `[Bến xuất phát] ───⛵─── 12/40 từ ─── [Đảo Kho Báu]`.
  - Biểu tượng thuyền buồm mini di chuyển mượt mà về phía trước khi người dùng thuộc thêm từ.
- **Thẻ Câu hỏi (The Question Scroll):**
  - Tờ giấy da cổ trung tâm (tái sử dụng [`flashcard-page.png`](file:///d:/Pham%20Duy%20Hung/PROJECT/LanguageLearning/frontend/public/assets/flashcard/flashcard-page.png)) với 4 góc minh họa la bàn, núi thông và thuyền buồm.
  - Hiển thị từ vựng / định nghĩa to rõ ràng bằng mực nâu đen `#3B2B1C`. Nút phát âm loa đồng cổ [`flashcard-sound.png`](file:///d:/Pham%20Duy%20Hung/PROJECT/LanguageLearning/frontend/public/assets/flashcard/flashcard-sound.png).
- **Ô nhập đáp án (Antique Quill & Ink Input):**
  - Khung nhập liệu giả lập trang giấy kẻ dòng cổ điển, viền đồng mảnh, con trỏ mượt mà.
  - Hỗ trợ gõ Telex/VNI tự nhiên không bị nuốt phím. Nút bấm `[ Trả lời (Enter) ]` và nút `[ Bỏ qua / Chưa biết ]` phong cách cổ điển.

---

### 3.3. Màn hình Phản hồi (Learn Feedback — Đóng Dấu Kết Quả)
- **Khi trả lời Đúng:**
  - Con dấu triện sáp xanh lục mộc bản (Moss Green Wax Seal) đóng dấu *"Chính xác!"*.
  - Âm thanh tiếng chuông bạc hân hoan, hiển thị phát âm IPA và câu ví dụ trên nền giấy sáng.
  - Nút bấm `[ Tiếp tục (Space / Enter) ]` nổi bật.
- **Khi trả lời Chưa đúng:**
  - Dấu triện đỏ sẫm da thuộc (Deep Red Wax Seal) *"Cần ghi nhớ lại"*.
  - Bảng so sánh 2 cột rõ ràng trên nền giấy da: *"Đáp án của bạn"* (chữ gạch đỏ nhẹ) và *"Đáp án chính xác"* (chữ mực nâu đậm kèm phiên âm).
  - Tùy chọn *"Câu trả lời của tôi lẽ ra nên được chấp nhận"* cho phép người dùng ghi đè (Override) linh hoạt.

---

### 3.4. Màn hình Báo công & Phần thưởng (Learn Results — Cập Bến Vinh Quang)
- **Minh họa Rương kho báu & Huân chương Thám hiểm:**
  - Điểm kinh nghiệm XP nhận được hiển thị bên trong huân chương vàng đồng sáng bóng.
  - 3 chỉ số cốt lõi đặt trong các khung giấy nhỏ viền vàng:
    1. **Tỷ lệ chính xác vòng đầu:** `%` (màu mực nâu lớn).
    2. **Thời gian thám hiểm:** `mm:ss`.
    3. **Tổng số lượt trả lời:** số lần gõ.
- **Danh sách từ cần ôn luyện:**
  - Liệt kê các từ người dùng đã trả lời sai thành bảng ghi chép hành trình để học lại ngay lập tức.
- **Nút hành động kết thúc:**
  - `[ ↺ Học lại các từ chưa thuộc ]` (Nút xanh rêu chính).
  - `[ ⟲ Học lại toàn bộ ]` (Nút giấy da phụ).
  - `[ ⇦ Về trang bộ từ ]` (Nút quay lại thư viện).

---

## 4. BẢNG MÀU & HỆ THỐNG ASSET TÁI SỬ DỤNG

### 4.1. Bảng màu chuẩn Vintage Pirate Explorer
- **Nền bản đồ:** `#F3E6C8` / `#FAF0DA`
- **Màu mực chữ chính:** `#3B2B1C` (Antique Deep Brown)
- **Màu mực phụ / phiên âm:** `#796246` (Sepia Ink)
- **Màu xanh rêu điểm nhấn / Nút chính:** `#46583A` (Moss Green), viền `#35442B`, chữ `#FAF0DA`
- **Màu vàng đồng viền khung:** `#B99A6A` / `#A8783E` (Antique Bronze)
- **Màu đỏ sáp triện (Sai / Cảnh báo):** `#992B2B` (Vintage Seal Red)

### 4.2. Các Asset có sẵn trong dự án được tái sử dụng
| Thành phần | Asset trong dự án | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Nền trang toàn màn hình** | `/assets/flashcard/vintage-map-bg.jpg` | Trải đều toàn bộ màn hình, hải đồ cổ với la bàn và đường kinh vĩ tuyến |
| **Nút Thoát / Quay lại** | `/assets/flashcard/button-back.png` | Nút quay lại trên nền giấy nhỏ viền khắc chữ nâu |
| **Icon sách tiêu đề** | `/assets/decor_icon/decor_vocabulary_book.png` | Icon cuốn sách cổ trên thanh tiêu đề |
| **Khung giấy da nền thiết lập** | `/assets/profile/profile-paper-bg.png` | Tờ giấy cổ lớn làm container chính cho 4 khối thiết lập |
| **Hoa văn la bàn góc** | `/assets/popup/popup_compass_rose.png` | La bàn cổ điển gắn ở góc tờ lệnh |
| **Khung viền 4 card thiết lập** | `/assets/flashcard/card-cream.png` | Khung giấy nhỏ cho 4 thẻ tùy chọn học tập |
| **Khung thẻ câu hỏi** | `/assets/flashcard/flashcard-page.png` | Tờ giấy da cổ trung tâm cho phần câu hỏi |
| **Góc minh họa thẻ câu hỏi** | `flashcard-compass.png`, `flashcard-landscape.png`, `flashcard-ship.png` | Các góc trang trí dãy núi, thuyền buồm, la bàn |
| **Nút phát âm loa** | `/assets/flashcard/flashcard-sound.png` | Nút loa tròn vàng đồng phát âm từ vựng |
| **Dải ruy băng trang trí** | `/assets/flashcard/flashcard-bottom-pill.png` | Dải phân cách hoa văn cổ dưới câu hỏi |

---

## 5. KẾ HOẠCH TRIỂN KHAI KỸ THUẬT

1. **Giai đoạn 1 — Tái thiết kế Màn hình Cài đặt (`LearnSetup.jsx` & `Learn.css`):**
   - Chuyển layout sang full-width không có sidebar.
   - Thay card trắng phẳng bằng khung giấy da cổ `profile-paper-bg.png`.
   - Tạo lại 4 card tùy chọn với viền giấy vintage và checkbox/radio cổ điển.
   - Tạo nút bấm hành động RPG `[ ⚔ BẮT ĐẦU HẢI TRÌNH HỌC TẬP ]`.
2. **Giai đoạn 2 — Tái thiết kế Màn hình Câu hỏi & Phản hồi (`LearnQuestion.jsx`, `LearnFeedback.jsx`):**
   - Biến thanh tiến độ thành "Hải trình thuyền buồm".
   - Dùng thẻ giấy cổ `flashcard-page.png` làm khung hiển thị câu hỏi và ô nhập liệu.
   - Thiết kế popup phản hồi đúng/sai dạng con dấu mộc bản.
3. **Giai đoạn 3 — Tái thiết kế Màn hình Kết quả (`LearnResults.jsx`):**
   - Tạo giao diện vinh danh với huân chương XP, thống kê hải trình và danh sách từ vựng.
4. **Giai đoạn 4 — Kiểm thử & Xác nhận:**
   - Bảo toàn 100% logic thuật toán học lặp lại (Leitner queue, audio, IME composition).
   - Chạy Playwright chụp ảnh màn hình các bước và kiểm tra trên Desktop/Mobile.
