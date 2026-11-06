# Báo Cáo Đo Baseline Hiệu Năng (Giai Đoạn 0.5 - Cập Nhật Công Cụ Đo Chuẩn)

> **Mục tiêu**: Nâng cấp công cụ đo kiểm chuẩn (sử dụng `datasource-proxy` bọc JDBC để đo chính xác cả Hibernate và `JdbcTemplate`), kiểm tra phân tách 3 kịch bản của API `PUT /api/decks/{id}`, bổ sung các chỉ số chuyên sâu (Cold vs Warm, số dòng DB đọc, dung lượng response bytes, số lần batch statement) và audit chi tiết tài nguyên tĩnh `frontend/public`. Logic nghiệp vụ không có bất kỳ thay đổi nào.

---

## 1. Backend & Database Query Baseline (Cập Nhật Giai Đoạn 0.5)

- **Môi trường đo**: Real PostgreSQL 18 (Cơ sở dữ liệu kiểm thử độc lập `language_learning_test`).
- **Công cụ đo**: `MockMvc` + `datasource-proxy` (bọc `DataSource` ở test scope), lắng nghe toàn bộ statement execution (Hibernate, JdbcTemplate, native batch) và `ResultSet.next()` để đếm số dòng dữ liệu đọc.
- **Tập dữ liệu kiểm chuẩn (Benchmark Dataset)**:
  - 1 Perf User (`perf@languagelearning.com`) + 1 User thứ cấp tạo nhiễu đa người dùng.
  - 20 Vocabulary Sets (Bộ từ vựng).
  - 5.000 Vocabularies chuẩn hóa kèm phiên âm, ngữ cảnh, nghĩa và từ loại.
  - ~5.000 Synonyms (Từ đồng nghĩa).
  - 10.000 Bản ghi Study Progress (SM-2 Spaced Repetition).
  - 2.000 Study Sessions hoàn chỉnh kèm 10.000 Study Answers.
  - 1 Study Plan đang hoạt động (`ACTIVE`) chứa 10 bộ từ vựng (`sort_order` 1..10, `revision = 1`).
- **Quy trình đo chuẩn hóa**: 1 lần chạy đầu tiên (**COLD RUN**) + 5 lần chạy kế tiếp (**WARM RUNS**), tính giá trị trung vị (**WARM MEDIAN**).

### Bảng Chỉ Số Baseline Chi Tiết

| Nhóm chức năng / API Endpoint | Chế độ | Số query DB | Batch (Lần / Dòng) | Số dòng DB đọc | Thời gian (ms) | Response Size (Bytes) | Ghi chú kỹ thuật & Đối chiếu Baseline cũ (Phase 0) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Ghi nhận học tập theo đợt**:<br>`POST /api/study/sessions`<br>+ `POST /sessions/{id}/answers`<br>(Batch 20 câu) | **COLD**<br>**WARM** | **188** q<br>**188** q | 0 (0 r)<br>0 (0 r) | 75 r<br>75 r | **1.026 ms**<br>**483 ms** | 712 B<br>715 B | N+1 query lặp qua từng câu trả lời: load từ vựng, tính SM-2, cập nhật `study_progress` và insert `study_answers` riêng lẻ.<br>*Đối chiếu cũ (Phase 0)*: 188 queries, 488 ms.<br>*Runs*: `1026ms(188q), 483ms(188q), 506ms(188q), 298ms(188q), 248ms(188q), 679ms(188q)`. |
| **Hàng đợi ôn tập hôm nay**:<br>`GET /api/study-plans/current/today` | **COLD**<br>**WARM** | **5** q<br>**5** q | 0 (0 r)<br>0 (0 r) | 2.831 r<br>2.831 r | **350 ms**<br>**125 ms** | 15.628 B<br>15.628 B | Đọc tới **2.831 dòng dữ liệu** từ DB để lọc thẻ đến hạn ôn hôm nay.<br>*Đối chiếu cũ (Phase 0)*: 5 queries, 111 ms.<br>*Runs*: `350ms(5q), 182ms(5q), 125ms(5q), 129ms(5q), 121ms(5q), 93ms(5q)`. |
| **Chi tiết lộ trình ôn tập hiện tại**:<br>`GET /api/study-plans/current` | **COLD**<br>**WARM** | **3** q<br>**3** q | 0 (0 r)<br>0 (0 r) | 12 r<br>12 r | **48 ms**<br>**23 ms** | 1.573 B<br>1.573 B | Single-source SQL aggregate $O(1)$ tối ưu ở Phase trước, chỉ đọc 12 dòng.<br>*Đối chiếu cũ (Phase 0)*: 3 queries, 21 ms.<br>*Runs*: `48ms(3q), 28ms(3q), 27ms(3q), 23ms(3q), 17ms(3q), 18ms(3q)`. |
| **Tổng quan thống kê học tập**:<br>`GET /api/analytics/overview` | **COLD**<br>**WARM** | **2** q<br>**2** q | 0 (0 r)<br>0 (0 r) | 69 r<br>69 r | **15 ms**<br>**10 ms** | 290 B<br>290 B | Tổng hợp học tập, streak và tỷ lệ chính xác.<br>*Đối chiếu cũ (Phase 0)*: 2 queries, 7 ms.<br>*Runs*: `15ms(2q), 7ms(2q), 10ms(2q), 14ms(2q), 10ms(2q), 8ms(2q)`. |
| **Danh sách từ yếu**:<br>`GET /api/analytics/weak-words?limit=10` | **COLD**<br>**WARM** | **1** q<br>**1** q | 0 (0 r)<br>0 (0 r) | 20 r<br>20 r | **14 ms**<br>**5 ms** | 124 B<br>124 B | Lọc từ có accuracy < 70% và wrong_count > 0.<br>*Đối chiếu cũ (Phase 0)*: 1 query, 8 ms.<br>*Runs*: `14ms(1q), 7ms(1q), 5ms(1q), 6ms(1q), 5ms(1q), 4ms(1q)`. |
| **Phân bổ ghi nhớ retention**:<br>`GET /api/analytics/retention` | **COLD**<br>**WARM** | **3** q<br>**3** q | 0 (0 r)<br>0 (0 r) | 48 r<br>48 r | **17 ms**<br>**11 ms** | 215 B<br>215 B | Thống kê theo các dải ghi nhớ SM-2.<br>*Đối chiếu cũ (Phase 0)*: 3 queries, 13 ms.<br>*Runs*: `17ms(3q), 10ms(3q), 9ms(3q), 11ms(3q), 19ms(3q), 14ms(3q)`. |
| **Biểu đồ nhiệt hoạt động**:<br>`GET /api/analytics/heatmap` | **COLD**<br>**WARM** | **1** q<br>**1** q | 0 (0 r)<br>0 (0 r) | 49 r<br>49 r | **22 ms**<br>**7 ms** | 320 B<br>320 B | Tổng hợp hoạt động 365 ngày.<br>*Đối chiếu cũ (Phase 0)*: 1 query, 8 ms.<br>*Runs*: `22ms(1q), 10ms(1q), 7ms(1q), 6ms(1q), 6ms(1q), 7ms(1q)`. |
| **Toàn bộ Suite Analytics tổng hợp**:<br>`overview` + `weak-words`<br>+ `retention` + `heatmap` | **COLD**<br>**WARM** | **7** q<br>**7** q | 0 (0 r)<br>0 (0 r) | 186 r<br>186 r | **34 ms**<br>**26 ms** | 949 B<br>949 B | Truy cập trang Dashboard Analytics.<br>*Đối chiếu cũ (Phase 0)*: 7 queries, 32 ms.<br>*Runs*: `34ms(7q), 30ms(7q), 26ms(7q), 23ms(7q), 37ms(7q), 24ms(7q)`. |
| **(a) Sửa 500 thẻ có sẵn**:<br>`PUT /api/decks/{id}`<br>*(kèm ID thẻ hiện có)* | **COLD**<br>**WARM** | **2.503** q<br>**2.502** q | 0 (0 r)<br>0 (0 r) | 1.501 r<br>1.501 r | **2.552 ms**<br>**1.301 ms** | 132.901 B<br>132.901 B | 🔴 **PHÁT HIỆN LỖI ĐO GIAI ĐOẠN 0**: Ở Phase 0, test gửi `id = null` nên lọt vào nhánh insert thẻ mới và Hibernate Statistics không đếm JdbcTemplate. Khi gửi đúng thẻ kèm ID hiện có, code chạy N+1: với mỗi thẻ (SELECT vocab + UPDATE vocab + DELETE synonym + INSERT synonym) => **2.502 queries** tốn tới **1,30 giây** (lên tới 2,55 giây ở cold run)!<br>*Runs*: `2552ms(2503q), 1510ms(2502q), 1438ms(2502q), 1178ms(2502q), 1301ms(2502q), 1032ms(2502q)`. |
| **(b) Thêm 500 thẻ mới**:<br>`PUT /api/decks/{id}`<br>*(id = null)* | **COLD**<br>**WARM** | **6** q<br>**5** q | 0 (0 r)<br>0 (0 r) | 501 r<br>501 r | **90 ms**<br>**77 ms** | 125.402 B<br>125.399 B | Chạy qua `createCardsForDeckBatch` dùng multi-row SQL JdbcTemplate.<br>*Đối chiếu cũ (Phase 0)*: Từng bị báo nhầm là 2 queries do Hibernate Stats bỏ sót JdbcTemplate.<br>*Runs*: `90ms(6q), 93ms(5q), 77ms(5q), 58ms(5q), 80ms(5q), 67ms(5q)`. |
| **(c) Xóa 500 thẻ**:<br>`PUT /api/decks/{id}`<br>*(gửi 1 thẻ giữ lại, 500 thẻ bị bỏ)* | **COLD**<br>**WARM** | **10** q<br>**9** q | 0 (0 r)<br>0 (0 r) | 504 r<br>504 r | **57 ms**<br>**49 ms** | 585 B<br>585 B | Chạy qua `deleteCardsFromDeckBatch` xóa liên kết và cascade từ vựng không dùng chung.<br>*Runs*: `57ms(10q), 49ms(9q), 45ms(9q), 56ms(9q), 57ms(9q), 48ms(9q)`. |
| **Danh sách bộ từ vựng**:<br>`GET /api/decks` | **COLD**<br>**WARM** | **3** q<br>**3** q | 0 (0 r)<br>0 (0 r) | 54 r<br>54 r | **24 ms**<br>**9 ms** | 6.710 B<br>6.710 B | Lấy 20 bộ từ kèm số lượng thẻ.<br>*Đối chiếu cũ (Phase 0)*: 3 queries, 18 ms.<br>*Runs*: `24ms(3q), 6ms(3q), 6ms(3q), 9ms(3q), 10ms(3q), 10ms(3q)`. |

---

## 2. Frontend Production Bundle & Chunks

- **Build Tool**: Vite v8.3.1 (Rollup).
- **Bundle Analyzer**: `rollup-plugin-visualizer` (kích hoạt qua `ANALYZE=true`).
- **Cảnh báo từ bundler**: Rollup phát cảnh báo kích thước chunk JS vượt ngưỡng khuyến nghị (> 500 kB sau minification) do chưa phân tách code động (`dynamic import() / codeSplitting`).

| Asset File / Chunk | Kích thước thô (Raw) | Kích thước nén Gzip | Kích thước sau Phase 1 | Ghi chú phân tích |
| :--- | :---: | :---: | :---: | :--- |
| **HTML Entry**: `dist/index.html` | 1.08 kB | **0.57 kB** | **0.57 kB** | File HTML gốc. |
| **CSS Bundle**: `dist/assets/index-*.css` | 366.56 kB | **62.44 kB** | **62.45 kB** | Toàn bộ style sheet toàn app gộp vào 1 file duy nhất (đã trỏ WebP). |
| **Main JS Bundle**: `dist/assets/index-*.js` | 711.64 kB | **195.26 kB** | **195.35 kB** | Monolithic bundle (sẽ được code-split ở Giai đoạn 2). |
| **Tổng dung lượng tải về ban đầu (Initial Download)** | **1.079,28 kB** | **258,27 kB** | **258,37 kB** | Tổng kích thước tài nguyên tải về lúc trang chủ khởi động (chưa tính assets tĩnh). |

---

## 3. Audit Tài Nguyên Tĩnh (`frontend/public`)

- **Trước tối ưu (Phase 0.5)**:
  - Tổng số lượng tệp: **391** tệp.
  - Tổng dung lượng thư mục: **76.521.373 bytes (~72,98 MB)**.
- **Sau tối ưu (Phase 1C)**:
  - Tổng dung lượng thư mục: **9.596.542 bytes (~9,15 MB)**.
  - **Tỷ lệ giảm**: **-87,5%** (-63,83 MB), vượt xa chỉ tiêu $\ge 70\%$.
  - Toàn bộ tài nguyên gốc, sprite sheets, mockup được di chuyển an toàn vào `design-assets/` ở thư mục gốc (không bundle vào production).
  - Tất cả ảnh PNG/JPG lớn được chuyển đổi sang định dạng WebP (quality 80) kèm lazy loading và decoding async.
  - Cấu hình cache header cho Vercel (`vercel.json`) với immutable 1 năm cho hashed build assets và 7 ngày cho static public assets.

### Top 20 Tệp Dung Lượng Lớn Nhất Trong `frontend/public` (Trạng Thái SAU Tối Ưu)

| STT | Tên tệp | Đường dẫn tương đối | Kích thước | Định dạng | Trạng thái tham chiếu / Sử dụng trong mã nguồn |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | `forest-island.mp4` | `assets/animation/forest-island.mp4` | **3,17 MB** | MP4 | ✅ **1 tham chiếu**: Video nền chuyển động bản đồ đảo (`WorldMap.jsx`). |
| 2 | `wallpaper-meadow.webp` | `wallpapers/wallpaper-meadow.webp` | **1,01 MB** | WebP | ✅ **2 tham chiếu**: Preset hình nền đồng cỏ (`WallpaperContext.jsx`). Giảm từ 2,08 MB JPG. |
| 3 | `wallpaper-forest.webp` | `wallpapers/wallpaper-forest.webp` | **819 KB** | WebP | ✅ **2 tham chiếu**: Preset hình nền rừng (`WallpaperContext.jsx`). Giảm từ 1,68 MB JPG. |
| 4 | `wallpaper-valley.webp` | `wallpapers/wallpaper-valley.webp` | **503 KB** | WebP | ✅ **3 tham chiếu**: Preset hình nền thung lũng mặc định (`WallpaperContext.jsx`). Giảm từ 1,26 MB JPG. |
| 5 | `spaced-repetition-paper.webp` | `assets/popup/spaced-repetition-paper.webp` | **193 KB** | WebP | ✅ **1 tham chiếu**: Giấy da cuộn popup dự báo ôn tập (`SpacedRepetitionForecastModal.css`). Giảm từ 2,24 MB PNG (-91.4%). |
| 6 | `backgrounddao.webp` | `assets/background/backgrounddao.webp` | **189 KB** | WebP | ✅ **2 tham chiếu**: Bản đồ nền thư viện RPG (`lexiconMapData.js`, `RpgLibraryWorkspace.css`). Giảm từ 2,82 MB PNG (-93.3%). |
| 7 | `forest-island-mask.png` | `assets/animation/forest-island-mask.png` | **91 KB** | PNG (8-bit) | ✅ **1 tham chiếu**: Mặt nạ viền chuyển động cho video bản đồ đảo (`WorldMap.jsx`). |
| 8 | `texture_watercolor_wash_blue.png` | `assets/nen_texture/texture_watercolor_wash_blue.png` | **87 KB** | PNG (8-bit) | ✅ **Texture UI**: Hiệu ứng màu nước nền thẻ bài/bản đồ. Đã nén palette. |
| 9 | `ornament_red_compass_stamp.png` | `assets/nen_texture/ornament_red_compass_stamp.png` | **76 KB** | PNG (8-bit) | ✅ **Họa tiết UI**: Dấu ấn la bàn đỏ phong cách cổ. Đã nén palette. |
| 10 | `texture_parchment_edge_vertical.png` | `assets/nen_texture/texture_parchment_edge_vertical.png` | **70 KB** | PNG (8-bit) | ✅ **Texture UI**: Viền cuộn giấy da dọc trang trí. Đã nén palette. |
| 11 | `ornament_compass_rose.png` | `assets/nen_texture/ornament_compass_rose.png` | **68 KB** | PNG (8-bit) | ✅ **Họa tiết UI**: Hoa la bàn cổ bản đồ RPG. Đã nén palette. |
| 12 | `rank-supreme.png` | `assets/badges/rank-supreme.png` | **62 KB** | PNG (8-bit) | ✅ **1 tham chiếu**: Huy hiệu Rank Tối Thượng (`ranks.js`). Đã tối ưu palette. |
| 13 | `profile-ship-illustration.webp` | `assets/profile/profile-ship-illustration.webp` | **61 KB** | WebP | ✅ **1 tham chiếu**: Minh họa con thuyền trang hồ sơ cá nhân (`Profile.jsx`). |
| 14 | `ornament_green_ribbon.png` | `assets/nen_texture/ornament_green_ribbon.png` | **56 KB** | PNG (8-bit) | ✅ **Họa tiết UI**: Dải ruy băng ngọc lục bảo. Đã nén palette. |
| 15 | `sign_wooden_blank.png` | `assets/nen_texture/sign_wooden_blank.png` | **56 KB** | PNG (8-bit) | ✅ **Texture UI**: Biển gỗ trống dẫn đường bản đồ. Đã nén palette. |
| 16 | `vintage-map-bg.webp` | `assets/flashcard/vintage-map-bg.webp` | **55 KB** | WebP | ✅ **1 tham chiếu**: Nền flashcard bản đồ cổ (`FlashcardFront.jsx`). Giảm từ 520 KB PNG. |
| 17 | `rank-legendary.png` | `assets/badges/rank-legendary.png` | **55 KB** | PNG (8-bit) | ✅ **1 tham chiếu**: Huy hiệu Rank Huyền Thoại (`ranks.js`). Đã tối ưu palette. |
| 18 | `decor_whale.png` | `assets/decor_icon/decor_whale.png` | **55 KB** | PNG (8-bit) | ✅ **Họa tiết UI**: Biểu tượng cá voi biển trên bản đồ hải trình. |
| 19 | `decor_map_scroll.png` | `assets/decor_icon/decor_map_scroll.png` | **54 KB** | PNG (8-bit) | ✅ **Họa tiết UI**: Cuộn hải đồ hải trình. |
| 20 | `decor_ship_wheel.png` | `assets/decor_icon/decor_ship_wheel.png` | **53 KB** | PNG (8-bit) | ✅ **Họa tiết UI**: Bánh lái tàu thám hiểm. |

---

## 4. Tổng Kết & Điểm Nghẽn Lớn Nhất Xác Định Được

1. **Điểm nghẽn Backend N+1 nghiêm trọng nhất (Mới phát hiện tại Phase 0.5)**:
   - **`PUT /api/decks/{id}` (Sửa 500 thẻ có sẵn)**: Gây ra tới **2.502 queries** DB trong 1 request duy nhất (trung bình ~5 query cho mỗi thẻ do vòng lặp SELECT, UPDATE, DELETE synonym, INSERT synonym qua JPA). Thời gian phản hồi lên tới **1.301 ms (Warm)** và **2.552 ms (Cold)**!
   - **`POST /api/study/sessions/{id}/answers` (Nộp batch 20 câu)**: Gây ra **188 queries** DB (trung bình ~9.4 query/câu) với thời gian phản hồi **483 ms (Warm)** và **1.026 ms (Cold)**.
   - **`GET /api/study-plans/current/today`**: Đang đọc tới **2.831 dòng dữ liệu** từ DB vào bộ nhớ app để tính toán hàng đợi ôn tập, tốn **125 ms (Warm)** và **350 ms (Cold)**.

2. **Điểm nghẽn Frontend & Tài nguyên tĩnh**:
   - Monolithic bundle `index.js` có dung lượng gzip **195,26 kB** (711,64 kB raw) chưa được code-split.
   - Thư mục `frontend/public` ban đầu chứa **40,95 MB** tệp rác (dead asset, raw design, duplicate) trong Top 20 tệp lớn nhất, đặc biệt video `13772604_3840_2160_60fps.mp4` nặng **22,84 MB** hoàn toàn không có tham chiếu.

---

## 5. Kết Quả Sau Giai Đoạn 1 (Quick Wins: 1A, 1B, 1C)

### 5.1. Cấu hình Backend & Nén Gzip (Phần 1A)
- **`spring.jpa.open-in-view=false`**: Đã tắt thành công, không phát sinh bất kỳ lỗi `LazyInitializationException` nào trên toàn bộ 10 API core do Service layer đều thực hiện DTO projection trong `@Transactional`.
- **JDBC Statement Batching**: Cấu hình `batch_size=50`, `order_inserts=true`, `order_updates=true` đã được Hibernate kích hoạt (`HHH100501: Automatic JDBC statement batching enabled (maximum batch size 50)`).
- **HTTP Gzip Response Compression**:
  - Endpoint `GET /api/decks` (20 bộ từ, 5.000 thẻ):
    - Kích thước thô chưa nén: **7.998 bytes**.
    - Kích thước sau nén Gzip: **915 bytes** (Header `Content-Encoding: gzip`).
    - **Tỷ lệ giảm băng thông mạng**: **-88,6%**!

### 5.2. Migration Index Database V10 (Phần 1B)
Số liệu đo đạc chuẩn hóa qua `ExplainPlanIntegrationTest` (1 lần khởi động + 5 lần đo lấy trung vị, trên cùng cơ sở dữ liệu đã seed 20 deck, 5.000 vocabularies, 10.000 study progress):

| Truy vấn | Giai đoạn | Planning Time (ms) | Execution Time (ms) | Buffers (Shared Hit / Read) | Ghi chú & Đánh giá thay đổi |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`LIST_DECKS`** | Trước V10 | **0,056 ms** | **0,036 ms** | Hit: 2 / Read: 0 | `Seq Scan` + `Sort (created_at DESC)` in-memory trên 20 bộ từ. |
| | Sau V10 | **0,103 ms** | **0,053 ms** | Hit: 2 / Read: 0 | **Loại bỏ hoàn toàn bước Sort**, dùng `Index Scan using idx_vocabulary_sets_user_created`. Với tập dữ liệu nhỏ trong buffer cache, thời gian đo tương đương nhau (~0,04 - 0,05 ms); lợi ích chính là bảo vệ DB không bị Sort in-memory khi số lượng bộ từ tăng cao. |
| **`DECK_STATS`** | Trước V10 | **0,533 ms** | **1,562 ms** | Hit: 151 / Read: 0 | Dùng `idx_study_plan_decks_plan_order` và `idx_vocabulary_set_items_deck_vocab`. |
| | Sau V10 | **0,678 ms** | **1,730 ms** | Hit: 151 / Read: 0 | **V10 không thay đổi index nào của query này** (các index đã có từ V9 trở về trước), thời gian thực thi dao động ngẫu nhiên ổn định ~1,56 - 1,73 ms. (Số 3,2 ms trước đây là đo đơn lẻ khi chưa warm-up). |
| **`PLAN_AGGREGATE`** | Trước V10 | **0,515 ms** | **7,228 ms** | Hit: 41.416 / Read: 0 | `HashAggregate` trên biểu thức chuỗi `LOWER(BTRIM(v.word, ...))`, kích thước tuple 40 bytes. |
| | Sau V10 | **0,483 ms** | **5,662 ms** | Hit: 41.416 / Read: 0 | **Dùng cột sinh `v.word_norm`**: Execution time giảm **-21,7%** (từ 7,23 ms xuống 5,66 ms), kích thước tuple HashAggregate giảm một nửa (từ 40 bytes xuống 22 bytes), Planning Time giảm nhẹ từ 0,52 ms xuống 0,48 ms. |

### 5.3. Tối ưu Asset Frontend & Cache Headers (Phần 1C)
- Dung lượng thư mục `frontend/public`: **72.98 MB -> 9.15 MB (-87.5%)**.
- Dọn sạch 22.84 MB video stock 4K không dùng và các bản raw/duplicate.
- Bảo toàn toàn bộ tài nguyên thiết kế tại thư mục gốc `design-assets/`.
- Chuyển đổi toàn bộ hình nền, bản đồ, thẻ bài, popup sang định dạng WebP (quality 80).
- Cấu hình cache header tại `vercel.json` (max-age 1 năm cho hashed build assets, 7 ngày cho public assets).

