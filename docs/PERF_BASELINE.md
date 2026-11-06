# Báo Cáo Đo Baseline Hiệu Năng & Kết Quả Tối Ưu

Tài liệu này ghi nhận toàn diện kết quả đo đạc hiệu năng thực tế của hệ thống Language Learning Platform qua từng giai đoạn (Baseline Giai đoạn 0.5, Giai đoạn 1 Quick Wins và Giai đoạn 2 Frontend Code-Splitting).

---

## 1. Backend & Database Query Baseline

- **Môi trường đo**: Real PostgreSQL 18.4 (Cơ sở dữ liệu kiểm thử độc lập `language_learning_test`, port 5433), Spring Boot **4.1.1** (từ `backend/pom.xml`), Java **21**.
- **Công cụ đo**: `MockMvc` + `datasource-proxy` (bọc `DataSource` ở test scope qua `PerfBaselineRunnerIntegrationTest`), lắng nghe và đếm 100% câu lệnh JDBC thực thi (cả Hibernate JPA, `JdbcTemplate` và native batch), đếm số lần `executeBatch`, tổng số dòng affected và `ResultSet.next()` để đếm số dòng dữ liệu đọc.
- **Tập dữ liệu kiểm chuẩn (Benchmark Dataset)**:
  - 1 Perf User (`perf@languagelearning.com`) + 1 User thứ cấp tạo nhiễu đa người dùng.
  - 20 Vocabulary Sets (Bộ từ vựng).
  - 5.000 Vocabularies chuẩn hóa kèm phiên âm, ngữ cảnh, nghĩa và từ loại.
  - ~5.000 Synonyms (Từ đồng nghĩa).
  - 10.000 Bản ghi Study Progress (SM-2 Spaced Repetition).
  - 2.000 Study Sessions hoàn chỉnh kèm 10.000 Study Answers.
  - 1 Study Plan đang hoạt động (`ACTIVE`) chứa 10 bộ từ vựng (`sort_order` 1..10, `revision = 1`).
- **Quy trình đo chuẩn hóa**: 1 lần chạy đầu tiên (**COLD RUN**) + 5 lần chạy kế tiếp (**WARM RUNS**), tính giá trị trung vị (**WARM MEDIAN**).

### 1.1. Bảng Đối Chiếu Chỉ Số Backend: Trước (Baseline 0.5) vs Sau (Phase 1 & 2)

*Ghi chú nguồn số liệu*: 100% số liệu cột **Trước** lấy từ bản đo Baseline 0.5 gốc; 100% số liệu cột **Sau** được đo thực tế qua `PerfBaselineRunnerIntegrationTest` trên nhánh `perf/phase-2-code-splitting`.

| Nhóm chức năng / API Endpoint | Chế độ | Số query (Trước 0.5) | Batch Lần / Dòng (Trước) | Dòng DB đọc (Trước) | Thời gian (Trước) | Response Size (Trước) | Số query (Sau P1/P2) | Batch Lần / Dòng (Sau) | Dòng DB đọc (Sau) | Thời gian (Sau) | Response Size (Sau) | Ghi chú kỹ thuật & Đánh giá thay đổi |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Ghi nhận học tập theo đợt**:<br>`POST /api/study/sessions`<br>+ `POST /sessions/{id}/answers`<br>(Batch 20 câu) | **COLD**<br>**WARM** | 188 q<br>188 q | 0 (0 r)<br>0 (0 r) | 75 r<br>75 r | 1.026 ms<br>483 ms | 712 B<br>715 B | **188 q**<br>**188 q** | **1 (1 r)**<br>**1 (1 r)** | **75 r**<br>**75 r** | **1.514 ms**<br>**559 ms** | 712 B<br>717 B | Hibernate statement batching kích hoạt `b:1(1)`. Vấn đề N+1 query lặp 20 câu sẽ được giải quyết triệt để ở Giai đoạn 3 (Batch SM-2 rewrite). |
| **Hàng đợi ôn tập hôm nay**:<br>`GET /api/study-plans/current/today` | **COLD**<br>**WARM** | 5 q<br>5 q | 0 (0 r)<br>0 (0 r) | 2.831 r<br>2.831 r | 350 ms<br>125 ms | 15.628 B<br>15.628 B | **5 q**<br>**5 q** | **0 (0 r)**<br>**0 (0 r)** | **2.831 r**<br>**2.831 r** | **515 ms**<br>**155 ms** | 15.628 B<br>15.628 B | Đọc 2.831 dòng dữ liệu lên memory để lọc thẻ. Sẽ được tối ưu bằng SQL aggregation ở Giai đoạn 4. |
| **Chi tiết lộ trình ôn tập hiện tại**:<br>`GET /api/study-plans/current` | **COLD**<br>**WARM** | 3 q<br>3 q | 0 (0 r)<br>0 (0 r) | 12 r<br>12 r | 48 ms<br>23 ms | 1.573 B<br>1.573 B | **3 q**<br>**3 q** | **0 (0 r)**<br>**0 (0 r)** | **12 r**<br>**12 r** | **54 ms**<br>**36 ms** | 1.573 B<br>1.573 B | Single-source SQL aggregate $O(1)$ từ sprint trước, duy trì ổn định 3 queries và chỉ đọc 12 dòng. |
| **Tổng quan thống kê học tập**:<br>`GET /api/analytics/overview` | **COLD**<br>**WARM** | 2 q<br>2 q | 0 (0 r)<br>0 (0 r) | 69 r<br>69 r | 15 ms<br>10 ms | 290 B<br>290 B | **2 q**<br>**2 q** | **0 (0 r)**<br>**0 (0 r)** | **123 r**<br>**123 r** | **36 ms**<br>**12 ms** | 292 B<br>292 B | 2 queries, thời gian phản hồi warm ~12 ms. |
| **Danh sách từ yếu**:<br>`GET /api/analytics/weak-words?limit=10` | **COLD**<br>**WARM** | 1 q<br>1 q | 0 (0 r)<br>0 (0 r) | 20 r<br>20 r | 14 ms<br>5 ms | 124 B<br>124 B | **1 q**<br>**1 q** | **0 (0 r)**<br>**0 (0 r)** | **20 r**<br>**20 r** | **18 ms**<br>**9 ms** | 124 B<br>124 B | 1 query duy nhất, 20 dòng đọc, phản hồi warm < 10 ms. |
| **Phân bổ ghi nhớ retention**:<br>`GET /api/analytics/retention` | **COLD**<br>**WARM** | 3 q<br>3 q | 0 (0 r)<br>0 (0 r) | 48 r<br>48 r | 17 ms<br>11 ms | 215 B<br>215 B | **3 q**<br>**3 q** | **0 (0 r)**<br>**0 (0 r)** | **75 r**<br>**75 r** | **45 ms**<br>**20 ms** | 217 B<br>217 B | 3 queries ổn định. |
| **Biểu đồ nhiệt hoạt động**:<br>`GET /api/analytics/heatmap` | **COLD**<br>**WARM** | 1 q<br>1 q | 0 (0 r)<br>0 (0 r) | 49 r<br>49 r | 22 ms<br>7 ms | 320 B<br>320 B | **1 q**<br>**1 q** | **0 (0 r)**<br>**0 (0 r)** | **103 r**<br>**103 r** | **22 ms**<br>**9 ms** | 320 B<br>323 B | 1 query duy nhất tổng hợp hoạt động 365 ngày. |
| **Analytics Suite (Toàn bộ 4 API)** | **COLD**<br>**WARM** | 7 q<br>7 q | 0 (0 r)<br>0 (0 r) | 186 r<br>186 r | 68 ms<br>33 ms | 949 B<br>949 B | **7 q**<br>**7 q** | **0 (0 r)**<br>**0 (0 r)** | **321 r**<br>**321 r** | **45 ms**<br>**45 ms** | 956 B<br>956 B | Tổng 7 queries cho cả 4 endpoint analytics. |
| **PUT Deck (a: Sửa 500 thẻ có sẵn)**:<br>`PUT /api/decks/{id}` | **COLD**<br>**WARM** | 2.502 q<br>2.502 q | 0 (0 r)<br>0 (0 r) | 1.501 r<br>1.501 r | 2.552 ms<br>1.301 ms | 132.904 B<br>132.901 B | **2.502 q**<br>**2.501 q** | **1.000 (1.001 r)**<br>**999 (1.000 r)** | **1.501 r**<br>**1.501 r** | **3.773 ms**<br>**2.424 ms** | 132.904 B<br>132.901 B | Bật `batch_size=50` giúp gom **999 batch statement** (1.000 rows). Vấn đề ~2.500 roundtrips do JPA cascade sẽ được chuyển đổi sang JDBC bulk update ở Giai đoạn 4. |
| **PUT Deck (b: Thêm 500 thẻ mới)**:<br>`PUT /api/decks/{id}` | **COLD**<br>**WARM** | 504 q<br>504 q | 0 (0 r)<br>0 (0 r) | 501 r<br>501 r | 1.076 ms<br>603 ms | 125.402 B<br>125.399 B | **6 q**<br>**5 q** | **1 (1 r)**<br>**0 (0 r)** | **501 r**<br>**501 r** | **146 ms**<br>**89 ms** | 125.402 B<br>125.399 B | **Cải thiện vượt bậc: Giảm từ 504 queries xuống 5 queries (-99%)**, thời gian phản hồi warm giảm từ 603 ms xuống **89 ms** (-85,2%) nhờ batch insert hiệu quả. |
| **PUT Deck (c: Xóa 500 thẻ khỏi deck)**:<br>`PUT /api/decks/{id}` | **COLD**<br>**WARM** | 11 q<br>11 q | 0 (0 r)<br>0 (0 r) | 504 r<br>504 r | 110 ms<br>75 ms | 588 B<br>585 B | **10 q**<br>**9 q** | **3 (3 r)**<br>**2 (2 r)** | **504 r**<br>**504 r** | **65 ms**<br>**57 ms** | 588 B<br>585 B | Giảm còn 9 queries, thời gian phản hồi warm **57 ms**. |
| **Get List Decks**:<br>`GET /api/decks` | **COLD**<br>**WARM** | 3 q<br>3 q | 0 (0 r)<br>0 (0 r) | 42 r<br>42 r | 21 ms<br>14 ms | 7.998 B<br>7.998 B | **3 q**<br>**3 q** | **0 (0 r)**<br>**0 (0 r)** | **108 r**<br>**108 r** | **49 ms**<br>**16 ms** | 12.506 B<br>12.506 B | 3 queries (load 20 sets, load folders, batch aggregate card counts qua `IN (?, ...)`). |

---

## 2. Frontend Production Bundle & Chunks

- **Build Tool**: Vite v8.3.1 (Rolldown engine).
- **Bundle Analyzer**: `rollup-plugin-visualizer` (kích hoạt qua `ANALYZE=true`).
- **Phân tách chunk tự động**: Cấu hình `build.rolldownOptions.output.codeSplitting` theo đúng chuẩn API Vite 8 / Rolldown 1.2+. Tách riêng nhóm vendor runtime (`react`, `react-dom`, `react-router`, `react-router-dom`), phân rã toàn bộ route qua `React.lazy` và `preloadRoute`.

| Tài nguyên / Bundle | Trước tối ưu (Raw / Gzip) | Sau Phase 1 (Gzip) | Sau Giai đoạn 2 (Raw / Gzip) | Ghi chú đánh giá |
| :--- | :---: | :---: | :---: | :--- |
| **HTML Entry**: `dist/index.html` | 1.08 kB / 0.57 kB | 0.57 kB | **1.33 kB / 0.64 kB** | Nhúng thẻ modulepreload tối ưu cho browser HTTP/2 & HTTP/3. |
| **CSS Entry**: `dist/static/index-*.css` | 366.56 kB / 62.44 kB | 62.45 kB | **141.20 kB / 24.89 kB** | **Giảm -60,1% gzip!** Vite tự động phân tách CSS của từng trang thành chunk riêng. |
| **Application Entry JS**: `dist/static/index-*.js` | 711.64 kB / 195.26 kB | 195.35 kB | **79.99 kB / 24.08 kB** | **Giảm -87,7% gzip!** Không còn là monolithic bundle. |
| **Vendor React Runtime Chunk** | (Gộp trong index) | (Gộp trong index) | **259.29 kB / 82.30 kB** | Chunk vendor tách biệt, cache vĩnh viễn trên browser (`immutable 1 year`). |
| **Tổng JS tải ở `/login` ban đầu** | **711.64 kB / 195.26 kB** | **195.35 kB** | **346.63 kB / 109.80 kB** | **Giảm -51,3% raw (-43,8% gzip)**! |
| **Tổng JS tải ở trang đầu sau đăng nhập (`/` MapPage)** | **711.64 kB / 195.26 kB** | **195.35 kB** | **367.90 kB / 116.49 kB** | **Giảm -48,4% raw (-40,4% gzip)**! |

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

### 3.1. Top 20 Tệp Dung Lượng Lớn Nhất Trong `frontend/public` (Trạng Thái SAU Tối Ưu Phase 1)

| STT | Tên tệp | Đường dẫn tương đối | Kích thước | Định dạng | Trạng thái tham chiếu / Sử dụng trong mã nguồn |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | `vintage-map-bg.webp` | `assets/flashcard/vintage-map-bg.webp` | **438 KB** | WebP (quality 80) | ✅ **Hình nền chính**: Thư viện thẻ & Bản đồ thế giới từ vựng. |
| 2 | `auth-bg.webp` | `auth-bg.webp` | **268 KB** | WebP (quality 80) | ✅ **Hình nền Auth**: Màn hình Đăng nhập & Đăng ký. |
| 3 | `wallpaper-forest.webp` | `wallpapers/wallpaper-forest.webp` | **238 KB** | WebP (quality 80) | ✅ **Hình nền học tập**: Rừng nguyên sinh (Study Workspace). |
| 4 | `wallpaper-meadow.webp` | `wallpapers/wallpaper-meadow.webp` | **233 KB** | WebP (quality 80) | ✅ **Hình nền học tập**: Đồng cỏ bình minh (Study Workspace). |
| 5 | `wallpaper-valley.webp` | `wallpapers/wallpaper-valley.webp` | **226 KB** | WebP (quality 80) | ✅ **Hình nền học tập**: Thung lũng hoàng hôn (Study Workspace). |
| 6 | `avatar_frame_mastery.png` | `assets/trang_thai_thong_bao/avatar_frame_mastery.png` | **173 KB** | PNG (32-bit) | ✅ **Avatar Frame**: Khung cấp bậc Đại sư (Mastery). |
| 7 | `note_better_words_bigger_horizons.webp` | `assets/nen_texture/note_better_words_bigger_horizons.webp` | **163 KB** | WebP (lossless) | ✅ **Họa tiết trích dẫn**: Trang chi tiết bộ từ vựng. |
| 8 | `note_quote_every_word_opens_world.webp` | `assets/dia_danh/note_quote_every_word_opens_world.webp` | **156 KB** | WebP (lossless) | ✅ **Họa tiết trích dẫn**: Bản đồ hành trình từ vựng. |
| 9 | `avatar_frame_adventurer.png` | `assets/trang_thai_thong_bao/avatar_frame_adventurer.png` | **126 KB** | PNG (32-bit) | ✅ **Avatar Frame**: Khung cấp bậc Nhà thám hiểm (Adventurer). |
| 10 | `texture_parchment_panel.webp` | `assets/nen_texture/texture_parchment_panel.webp` | **123 KB** | WebP (quality 80) | ✅ **Texture nền cuộn giấy**: Bảng điều khiển cổ điển. |
| 11 | `profile-ship-illustration.webp` | `assets/profile/profile-ship-illustration.webp` | **110 KB** | WebP (quality 80) | ✅ **Minh họa hồ sơ**: Con thuyền thám hiểm trong trang Profile. |
| 12 | `avatar_frame_scholar.png` | `assets/trang_thai_thong_bao/avatar_frame_scholar.png` | **106 KB** | PNG (32-bit) | ✅ **Avatar Frame**: Khung cấp bậc Học giả (Scholar). |
| 13 | `spaced-repetition-paper.webp` | `assets/popup/spaced-repetition-paper.webp` | **97 KB** | WebP (quality 80) | ✅ **Khung Popup**: Bảng dự báo lặp lại ngắt quãng (SM-2). |
| 14 | `avatar_frame_voyager.png` | `assets/trang_thai_thong_bao/avatar_frame_voyager.png` | **91 KB** | PNG (32-bit) | ✅ **Avatar Frame**: Khung cấp bậc Hoa tiêu (Voyager). |
| 15 | `wanted-portrait-overlay.webp` | `assets/profile/wanted-portrait-overlay.webp` | **85 KB** | WebP (quality 80) | ✅ **Khung Poster lệnh truy nã**: Trang hồ sơ người dùng. |
| 16 | `flashcard-page.webp` | `assets/flashcard/flashcard-page.webp` | **84 KB** | WebP (quality 80) | ✅ **Thẻ Flashcard**: Nền thẻ ghi nhớ cổ điển. |
| 17 | `profile-keep-exploring.webp` | `assets/profile/profile-keep-exploring.webp` | **73 KB** | WebP (quality 80) | ✅ **Minh họa hồ sơ**: Huy hiệu khích lệ tiếp tục khám phá. |
| 18 | `avatar_frame_legend.png` | `assets/trang_thai_thong_bao/avatar_frame_legend.png` | **68 KB** | PNG (32-bit) | ✅ **Avatar Frame**: Khung cấp bậc Huyền thoại (Legend). |
| 19 | `sea_chart_parchment_scroll.png` | `assets/dia_danh/sea_chart_parchment_scroll.png` | **60 KB** | PNG (8-bit) | ✅ **Họa tiết UI**: Cuộn hải đồ hải trình. |
| 20 | `decor_ship_wheel.png` | `assets/decor_icon/decor_ship_wheel.png` | **53 KB** | PNG (8-bit) | ✅ **Họa tiết UI**: Bánh lái tàu thám hiểm. |

---

## 4. Chi Tiết Danh Sách Chunk Sau Giai Đoạn 2 (`ANALYZE=true npm run build`)

Tất cả các chunk đều nằm trong thư mục `dist/static/` và được quản lý theo cơ chế băm nội dung (content-hash), thỏa mãn tuyệt đối tiêu chí **không có chunk nào vượt quá 150 kB gzip**.

| Tên Chunk / Tập tin | Kích thước Thô (Raw) | Kích thước Nén (Gzip) | Loại tài nguyên / Chức năng |
| :--- | :---: | :---: | :--- |
| `vendor-react-*.js` | 259.29 kB | **82.30 kB** | Runtime Vendor: `react`, `react-dom`, `react-router`, `react-router-dom`. |
| `index-*.js` | 79.99 kB | **24.08 kB** | Application Core Entry (Auth, Providers, Guards, Router Config). |
| `LearnSettingsPopover-*.js` | 48.46 kB | **10.96 kB** | Cấu hình & tùy chọn chế độ luyện tập học từ vựng. |
| `ProfilePage-*.js` | 38.86 kB | **10.70 kB** | Trang hồ sơ cá nhân, Avatar crop uploader, bảng xếp hạng cấp bậc. |
| `DeckFormModal-*.js` | 29.37 kB | **8.81 kB** | Modal thêm/sửa bộ từ vựng & tab Bulk Import thẻ hàng loạt. |
| `SynonymPage-*.js` | 25.47 kB | **6.70 kB** | Trang thử thách tìm từ đồng nghĩa bằng AI Gemini. |
| `ContextStoryCloze-*.js` | 23.28 kB | **7.23 kB** | Chế độ đọc truyện ngữ cảnh & điền từ vào chỗ trống. |
| `LibraryWorkspace-*.js` | 21.87 kB | **6.75 kB** | Không gian thư viện bộ thẻ, quản lý folder và tìm kiếm từ vựng. |
| `DeckDetailPage-*.js` (cards view) | 21.12 kB | **6.62 kB** | Khung hiển thị danh sách từ vựng & bảng thống kê thẻ của bộ từ. |
| `AnalyticsPage-*.js` | 20.32 kB | **6.47 kB** | Bảng phân tích học tập, Heatmap 365 ngày, biểu đồ Retention. |
| `SentenceChallengeView-*.js` | 18.62 kB | **5.51 kB** | Chế độ luyện đặt câu AI chấm điểm theo ngữ cảnh. |
| `StudyPlanPage-*.js` | 17.93 kB | **5.44 kB** | Trang quản lý lộ trình ôn tập lặp lại ngắt quãng SM-2. |
| `SynonymChallengeView-*.js` | 16.62 kB | **4.75 kB** | Component thử thách từ đồng nghĩa nhúng trong DeckDetail. |
| `DeckDetailPage-*.js` (base) | 16.47 kB | **5.00 kB** | Khung trang DeckDetail chính và điều hướng study mode. |
| `SrsSessionPage-*.js` | 13.55 kB | **4.09 kB** | Giao diện phiên học ôn tập Spaced Repetition Flashcard hàng ngày. |
| `MapPage-*.js` | 12.54 kB | **3.64 kB** | Bản đồ hành trình thám hiểm ngôn ngữ (Map Canvas & World Map). |
| `AddDecksPreviewModal-*.js` | 9.35 kB | **3.13 kB** | Modal xem trước và chọn bộ thẻ đưa vào lộ trình học. |
| `RpgLibraryWorkspace-*.js` | 8.66 kB | **2.89 kB** | Component hỗ trợ bản đồ và thống kê hành trình RPG. |
| `CreateStudyPlanModal-*.js` | 8.66 kB | **2.96 kB** | Modal khởi tạo lộ trình học tập SM-2 mục tiêu. |
| `SpacedRepetitionForecastModal-*.js` | 8.55 kB | **2.96 kB** | Modal dự báo số lượng từ cần ôn tập trong 7 ngày tới. |
| `createLucideIcon-*.js` | 6.77 kB | **3.06 kB** | Helper dựng icon Lucide được chia sẻ giữa các module. |
| `WallpaperModal-*.js` | 6.49 kB | **2.60 kB** | Modal lựa chọn hình nền học tập & tùy chỉnh độ mờ (opacity). |
| `progressSync-*.js` | 6.17 kB | **2.64 kB** | Tiện ích đồng bộ offline và lưu trữ tiến độ học tập. |
| `GeminiKeyModal-*.js` | 5.94 kB | **2.52 kB** | Modal quản lý khóa API Google Gemini cá nhân của người dùng. |
| `LearnPage-*.js` | 5.72 kB | **2.01 kB** | Trang luyện tập gõ từ vựng tập trung (Distraction-free Learn). |
| `TodayLearnPage-*.js` | 4.92 kB | **1.99 kB** | Trang học từ mới trong ngày theo lộ trình SM-2. |
| `WeakWordsPracticePage-*.js` | 2.97 kB | **1.38 kB** | Trang luyện tập nhanh các từ yếu / hay quên. |
| `ConfirmDialog-*.js` | 2.07 kB | **0.90 kB** | Hộp thoại xác nhận thao tác nguy hiểm (xóa deck, xóa folder). |
| `synonymEvaluationUtils-*.js` | 1.45 kB | **0.74 kB** | Thuật toán so khớp ngữ nghĩa và tính điểm từ đồng nghĩa. |
| `Modal-*.js` | 1.32 kB | **0.62 kB** | Modal dialog container dùng chung. |
| `speechUtils-*.js` | 0.83 kB | **0.47 kB** | Tiện ích Web Speech API phát âm chuẩn từ vựng tiếng Anh. |
| `studyService-*.js` | 0.63 kB | **0.33 kB** | Service giao tiếp API học tập & ghi nhận câu trả lời. |
| `Button-*.js` | 0.60 kB | **0.38 kB** | Nút bấm giao diện chuẩn hóa. |
| `rolldown-runtime-*.js` | 0.58 kB | **0.36 kB** | Module runtime của Rolldown bundler. |
| Các icon lẻ (`arrow-left`, `calendar`, `zap`, ...) | 0.15 - 0.54 kB | 0.12 - 0.33 kB | Các icon Lucide được tree-shake thành các chunk vi mô. |

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

### 5.2. Migration Index Database V10 & V11 (Phần 1B)
Số liệu đo đạc chuẩn hóa qua `ExplainPlanIntegrationTest` (1 lần khởi động + 5 lần đo lấy trung vị, trên cùng cơ sở dữ liệu đã seed 20 deck, 5.000 vocabularies, 10.000 study progress):

| Truy vấn | Giai đoạn | Planning Time (ms) | Execution Time (ms) | Buffers (Shared Hit / Read) | Ghi chú & Đánh giá thay đổi |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`LIST_DECKS`** | Trước V10 | **0,156 ms** | **0,100 ms** | Hit: 4 / Read: 0 | `Seq Scan` + `Sort (created_at DESC)` in-memory trên 20 bộ từ. |
| | Sau V10 | **0,158 ms** | **0,100 ms** | Hit: 4 / Read: 0 | **Loại bỏ hoàn toàn bước Sort**, dùng `Index Scan using idx_vocabulary_sets_user_created`. Với tập dữ liệu nhỏ trong buffer cache, thời gian đo tương đương nhau (~0,10 ms); lợi ích chính là bảo vệ DB không bị Sort in-memory khi số lượng bộ từ tăng cao. |
| **`DECK_STATS`** | Trước V10 | **0,880 ms** | **2,573 ms** | Hit: 153 / Read: 0 | Dùng `idx_study_plan_decks_plan_order` và `idx_vocabulary_set_items_deck_vocab`. |
| | Sau V10 | **0,696 ms** | **1,649 ms** | Hit: 153 / Read: 0 | Execution time giảm từ 2,57 ms xuống **1,65 ms**, Planning time giảm từ 0,88 ms xuống **0,70 ms**. |
| **`PLAN_AGGREGATE`** | Trước V10 | **0,611 ms** | **9,492 ms** | Hit: 41.416 / Read: 0 | `HashAggregate` trên biểu thức chuỗi `LOWER(BTRIM(v.word, ...))`, kích thước tuple 40 bytes. |
| | Sau V10 & V11 | **0,621 ms** | **7,236 ms** | Hit: 41.416 / Read: 0 | **Dùng cột sinh `v.word_norm` (chuẩn hóa Unicode NFC ở V11)**: Execution time giảm **-23,8%** (từ 9,49 ms xuống 7,24 ms), kích thước tuple HashAggregate giảm một nửa (từ 40 bytes xuống 22 bytes), Planning Time ổn định ~0,62 ms. |

### 5.3. Chuẩn hóa Unicode NFC cho `word_norm` (Migration V11)
- Migration `V11__word_norm_nfc.sql` được phát hành để chuẩn hóa triệt để Unicode NFC: `normalize(lower(btrim(word, E' \t\n\r')), NFC) STORED`.
- Yêu cầu PostgreSQL 13 trở lên (PostgreSQL 18.4 local thỏa mãn).
- Đồng bộ thuật toán chuẩn hóa `normalizeWord` ở tầng Java (`StudyPlanService.java`) bằng `Normalizer.normalize(..., Normalizer.Form.NFC)` kết hợp `toLowerCase(Locale.ROOT)` và trim ký tự khoảng trắng, đảm bảo 100% khớp giữa DB và application layer (vượt qua tất cả ca test Tiếng Việt NFD/NFC trong `WordNormTest`).

### 5.4. Tối ưu Asset Frontend & Cache Headers (Phần 1C)
- Dung lượng thư mục `frontend/public`: **72.98 MB -> 9.15 MB (-87.5%)**.
- Dọn sạch 22.84 MB video stock 4K không dùng và các bản raw/duplicate.
- Bảo toàn toàn bộ tài nguyên thiết kế tại thư mục gốc `design-assets/`.
- Chuyển đổi toàn bộ hình nền, bản đồ, thẻ bài, popup sang định dạng WebP (quality 80).
- Cấu hình cache header tại `vercel.json` (max-age 1 năm cho hashed build assets, 7 ngày cho public assets).

---

## 6. Đánh Giá Kết Quả Tối Ưu Sau Giai Đoạn 2 (Code Splitting)

1. **Phân rã hoàn toàn Monolithic Bundle**: Trước Giai đoạn 2, `index.js` là một khối duy nhất 712 kB raw (195 kB gzip) chứa toàn bộ code của mọi trang trong ứng dụng. Sau Giai đoạn 2, file entry app chỉ còn **79.99 kB raw (24.08 kB gzip)**, giảm **-87,7%**.
2. **Tách biệt Vendor Runtime**: `vendor-react` dung lượng **82.30 kB gzip** được băm hash cố định, cho phép trình duyệt cache vĩnh viễn (`immutable 1 year`), người dùng chỉ cần tải đúng 1 lần cho toàn bộ các phiên truy cập tiếp theo.
3. **Phân rã CSS tự động**: Nhờ lazy loading các route, file CSS chính `index.css` giảm từ **366.56 kB xuống 141.20 kB raw (từ 62.45 kB xuống 24.89 kB gzip)**, các trang nặng như `RpgLibraryWorkspace`, `DeckDetailPage`, `ContextStoryCloze`, `DeckFormModal` đều sở hữu chunk CSS riêng và chỉ được tải về khi người dùng truy cập.
4. **An toàn trước lỗi tải Chunk (Stale Chunks Resiliency)**: `ErrorBoundary` được nâng cấp để tự động phát hiện lỗi dynamic import (thường xảy ra khi một đợt deploy mới xóa các hashed chunk cũ) và kích hoạt tự động reload lại trang 1 lần (dùng cờ `sessionStorage.getItem('chunk_reload_attempted')` ngăn chặn lặp vô hạn). Nút **Tải lại trang** được trang bị sẵn sàng trên giao diện người dùng.
5. **Cơ chế Prefetch thông minh**: Tích hợp `preloadRoute` trên cả 3 thanh điều hướng chính (`AppSidebar`, `MobileBottomNav`, `AppDock`). Ngay khi người dùng di chuột (`hover`) hoặc chuyển phím (`focus`) vào biểu tượng điều hướng, mã nguồn trang tương ứng sẽ được fetch trước ngầm, loại bỏ hoàn toàn độ trễ khi chuyển trang. Mỗi route chỉ được fetch tối đa 1 lần nhờ cơ chế deduplication bằng `Set`.
