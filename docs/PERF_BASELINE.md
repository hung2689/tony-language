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

| Asset File / Chunk | Kích thước thô (Raw) | Kích thước nén Gzip | Kích thước sau tối ưu (Sau) | Ghi chú phân tích |
| :--- | :---: | :---: | :---: | :--- |
| **HTML Entry**: `dist/index.html` | 1.08 kB | **0.57 kB** | *(để trống)* | File HTML gốc. |
| **CSS Bundle**: `dist/assets/index-BWUbR0wf.css` | 366.56 kB | **62.44 kB** | *(để trống)* | Toàn bộ style sheet toàn app gộp vào 1 file duy nhất. |
| **Main JS Bundle**: `dist/assets/index-C92dgrrB.js` | 711.64 kB | **195.26 kB** | *(để trống)* | Gộp toàn bộ React 19, Lucide icons, Canvas confetti, Router và tất cả feature pages vào một monolithic chunk (chưa lazy load). |
| **Tổng dung lượng tải về ban đầu (Initial Download)** | **1.079,28 kB** | **258,27 kB** | *(để trống)* | Tổng kích thước tài nguyên tải về lúc trang chủ khởi động (chưa tính assets tĩnh). |

---

## 3. Audit Tài Nguyên Tĩnh (`frontend/public`)

- **Tổng số lượng tệp**: **391** tệp.
- **Tổng dung lượng thư mục**: **76.521.373 bytes (~72,98 MB)**.
- **Audit tham chiếu trong `frontend/src` & `frontend/index.html`**:
  - Hơn **40,95 MB (chiếm > 56% tổng dung lượng `public/`)** là các tệp **hoàn toàn không được sử dụng**, tệp bản nháp thô (raw), hoặc tệp trùng lặp 100% (duplicate) giữa nhiều thư mục!
  - Đặc biệt, tệp video 4K **`13772604_3840_2160_60fps.mp4`** có dung lượng **22,84 MB** (chiếm gần 1/3 toàn bộ thư mục `public/`) **không có bất kỳ một tham chiếu nào trong toàn bộ mã nguồn** (dead asset).

### Top 20 Tệp Dung Lượng Lớn Nhất & Trạng Thái Tham Chiếu Trong Code

| STT | Tên tệp | Đường dẫn tương đối | Kích thước (MB) | Trạng thái tham chiếu trong mã nguồn (`src`) | Chi tiết / Vị trí tham chiếu |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | `13772604_3840_2160_60fps.mp4` | `video/13772604_3840_2160_60fps.mp4` | **22,84 MB** | ❌ **0 tham chiếu (DEAD ASSET)** | Không có bất kỳ dòng code nào trong `src` hay `index.html` sử dụng. |
| 2 | `forest-island.mp4` | `assets/animation/forest-island.mp4` | **3,17 MB** | ✅ **1 tham chiếu** | Được dùng tại `src/features/library/components/WorldMap.jsx:167`. |
| 3 | `forest-island.mp4` *(trùng)* | `assets/lexicon/animations/forest-island.mp4` | **3,17 MB** | ❌ **0 tham chiếu (DUPLICATE)** | Tệp trùng lặp nguyên bản của STT 2 nhưng không được dùng. |
| 4 | `backgrounddao.png` | `assets/background/backgrounddao.png` | **2,82 MB** | ✅ **2 tham chiếu** | Dùng trong `lexiconMapData.js` và `RpgLibraryWorkspace.css`. |
| 5 | `spaced-repetition-paper-raw.png` | `assets/popup/spaced-repetition-paper-raw.png` | **2,52 MB** | ❌ **0 tham chiếu (RAW / UNUSED)** | Bản thiết kế thô chưa xử lý, không dùng trong app. |
| 6 | `background-level-progression.png` | `assets/game-ui/background/background-level-progression.png` | **2,45 MB** | ❌ **0 tham chiếu (UNUSED)** | Ảnh nền giao diện game chưa gắn vào component nào. |
| 7 | `spaced-repetition-paper.png` | `assets/popup/spaced-repetition-paper.png` | **2,24 MB** | ✅ **1 tham chiếu** | Dùng trong `SpacedRepetitionForecastModal.css`. |
| 8 | `spaced-repetition-paper.png` *(trùng)* | `assets/backgrounds/spaced-repetition-paper.png` | **2,24 MB** | ❌ **0 tham chiếu (DUPLICATE)** | Tệp trùng lặp của STT 7. |
| 9 | `background-main-world.png` | `assets/game-ui/background/background-main-world.png` | **2,11 MB** | ❌ **0 tham chiếu (UNUSED)** | Tài nguyên chưa dùng. |
| 10 | `wallpaper-meadow.jpg` | `wallpapers/wallpaper-meadow.jpg` | **2,08 MB** | ✅ **2 tham chiếu** | Dùng trong `WallpaperContext.jsx`. |
| 11 | `background-hero-banner.png` | `assets/game-ui/background/background-hero-banner.png` | **1,98 MB** | ❌ **0 tham chiếu (UNUSED)** | Tài nguyên chưa dùng. |
| 12 | `wallpaper-forest.jpg` | `wallpapers/wallpaper-forest.jpg` | **1,68 MB** | ✅ **2 tham chiếu** | Dùng trong `WallpaperContext.jsx`. |
| 13 | `contact_sheet.png` | `assets/rpg/raw/contact_sheet.png` | **1,33 MB** | ❌ **0 tham chiếu (RAW / UNUSED)** | Contact sheet gốc của RPG sprites, không dùng trực tiếp. |
| 14 | `wallpaper-valley.jpg` | `wallpapers/wallpaper-valley.jpg` | **1,26 MB** | ✅ **3 tham chiếu** | Dùng trong `App.css` và `WallpaperContext.jsx`. |
| 15 | `popup_desktop_raw.png` | `assets/popup/popup_desktop_raw.png` | **891 KB** | ❌ **0 tham chiếu (RAW / UNUSED)** | Bản raw popup desktop. |
| 16 | `auth-bg.png` | `auth-bg.png` | **880 KB** | ✅ **1 tham chiếu** | Dùng làm hình nền đăng nhập trong `Auth.css`. |
| 17 | `forecast-parchment-frame.png` | `assets/spaced-repetition/forecast-parchment-frame.png` | **741 KB** | ✅ **1 tham chiếu** | Dùng trong `SpacedRepetitionForecastModal.css`. |
| 18 | `profile-paper-bg.png` | `profile-paper-bg.png` | **713 KB** | ✅ **1 tham chiếu** | Dùng trong `Profile.css`. |
| 19 | `profile-paper-bg.png` *(trùng 1)* | `assets/profile/backgrounds/profile-paper-bg.png` | **713 KB** | ❌ **0 tham chiếu (DUPLICATE)** | Tệp trùng lặp của STT 18. |
| 20 | `profile-paper-bg.png` *(trùng 2)* | `assets/profile/profile-paper-bg.png` | **713 KB** | ❌ **0 tham chiếu (DUPLICATE)** | Tệp trùng lặp của STT 18. |

---

## 4. Tổng Kết & Điểm Nghẽn Lớn Nhất Xác Định Được

1. **Điểm nghẽn Backend N+1 nghiêm trọng nhất (Mới phát hiện tại Phase 0.5)**:
   - **`PUT /api/decks/{id}` (Sửa 500 thẻ có sẵn)**: Gây ra tới **2.502 queries** DB trong 1 request duy nhất (trung bình ~5 query cho mỗi thẻ do vòng lặp SELECT, UPDATE, DELETE synonym, INSERT synonym qua JPA). Thời gian phản hồi lên tới **1.301 ms (Warm)** và **2.552 ms (Cold)**!
   - **`POST /api/study/sessions/{id}/answers` (Nộp batch 20 câu)**: Gây ra **188 queries** DB (trung bình ~9.4 query/câu) với thời gian phản hồi **483 ms (Warm)** và **1.026 ms (Cold)**.
   - **`GET /api/study-plans/current/today`**: Đang đọc tới **2.831 dòng dữ liệu** từ DB vào bộ nhớ app để tính toán hàng đợi ôn tập, tốn **125 ms (Warm)** và **350 ms (Cold)**.

2. **Điểm nghẽn Frontend & Tài nguyên tĩnh**:
   - Monolithic bundle `index.js` có dung lượng gzip **195,26 kB** (711,64 kB raw) chưa được code-split.
   - Thư mục `frontend/public` chứa **40,95 MB** tệp rác (dead asset, raw design, duplicate) trong Top 20 tệp lớn nhất, đặc biệt video `13772604_3840_2160_60fps.mp4` nặng **22,84 MB** hoàn toàn không có tham chiếu.
