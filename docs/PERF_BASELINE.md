# Baseline Hiệu Năng & Đo Đạc Tối Ưu (Performance Baseline & Profiling)

Tài liệu này ghi nhận kết quả đo đạc hiệu năng thực tế của hệ thống Language Learning Platform trước và sau các giai đoạn tối ưu hóa (Giai đoạn 0, Giai đoạn 1 và Giai đoạn 2).

---

## 1. Backend API Baseline (Đo trước & sau tối ưu)

- **Môi trường đo**: Localhost, cơ sở dữ liệu PostgreSQL 18.4 (Port 5433), Spring Boot 3.5.0 profile `perf`.
- **Dữ liệu mẫu (Perf Seed)**: 1 người dùng kiểm thử, 20 bộ từ vựng, 5.000 thẻ từ vựng (kèm synonyms), 10.000 bản ghi tiến độ học (`study_progress`), 2.000 phiên học (`study_sessions`) kèm câu trả lời (`study_answers`), 1 lộ trình học đang hoạt động (`study_plan` ACTIVE) gồm 10 bộ từ.
- **Phương pháp đo**: Đo bằng công cụ JDBC Proxy Listener chuyên dụng (`PerfBaselineRunnerIntegrationTest`), bắt và thống kê 100% câu lệnh JDBC thực tế (cả Hibernate JPA lẫn `JdbcTemplate`, đếm rõ số lần `executeBatch` và tổng số dòng affected). Mỗi kịch bản được chạy 1 lần khởi động (warm-up) + 5 lần đo chính thức, lấy giá trị **trung vị (Median)**.

| STT | Kịch bản / API Endpoint | Số query JDBC (Trước) | Thời gian ms (Trước) | Số query (Sau P1) | Thời gian ms (Sau P1) | Ghi chú & Đánh giá |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| 1 | **Create Session + Batch 20 Answers**<br>`POST /api/study/sessions` & `/answers` | 44 queries | 75,5 ms | **44 queries** | **74,2 ms** | Logic nghiệp vụ SM-2 + tính điểm XP và cấp độ. |
| 2 | **Get Today Queue**<br>`GET /api/study-plan/today-queue` | 4 queries | 3,8 ms | **4 queries** | **3,7 ms** | Lấy hàng đợi từ cần ôn tập trong ngày theo thuật toán SM-2. |
| 3 | **Get Current Study Plan**<br>`GET /api/study-plan/current` | 13 queries | 8,9 ms | **13 queries** | **8,4 ms** | Đã tối ưu O(1) SQL aggregates ở sprint trước. |
| 4 | **Analytics Overview**<br>`GET /api/analytics/overview` | 1 query | 1,8 ms | **1 query** | **1,7 ms** | Query tổng hợp chỉ số học tập, streak, số từ đã thuộc. |
| 5 | **Analytics Weak Words**<br>`GET /api/analytics/weak-words` | 1 query | 1,6 ms | **1 query** | **1,5 ms** | Danh sách 10 từ có tỷ lệ trả lời sai cao nhất. |
| 6 | **Analytics Retention Distribution**<br>`GET /api/analytics/retention` | 1 query | 1,9 ms | **1 query** | **1,8 ms** | Phân bổ thẻ theo các mức ghi nhớ (1-5). |
| 7 | **Analytics Activity Heatmap**<br>`GET /api/analytics/heatmap` | 1 query | 2,1 ms | **1 query** | **2,0 ms** | Bản đồ nhiệt hoạt động học tập trong 365 ngày qua. |
| 8a | **PUT Deck (Cập nhật 500 thẻ có sẵn)**<br>`PUT /api/decks/{id}` | 506 queries | 235,4 ms | **506 queries** | **228,1 ms** | Cập nhật thông tin chi tiết cho 500 thẻ hiện có. |
| 8b | **PUT Deck (Thêm 500 thẻ mới)**<br>`PUT /api/decks/{id}` | 1.006 queries | 352,1 ms | **1.006 queries** | **340,6 ms** | Tạo mới 500 thẻ từ vựng vào bộ thẻ hiện hữu. |
| 8c | **PUT Deck (Xóa 500 thẻ khỏi deck)**<br>`PUT /api/decks/{id}` | 505 queries | 184,2 ms | **505 queries** | **179,5 ms** | Gỡ bỏ 500 thẻ khỏi bộ từ vựng. |
| 9 | **Get List Decks**<br>`GET /api/decks` | 2 queries | 4,2 ms | **2 queries** | **3,9 ms** | Trả về danh sách 20 bộ từ (Response gzip: 915 bytes). |

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
| **Vendor React Runtime Chunk** | (Gộp trong index) | (Gộp trong index) | **259.29 kB / 82.30 kB** | Chunk vendor tách biệt, cache lâu dài trên browser. |
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

## 5. Đánh Giá Kết Quả Tối Ưu Sau Giai Đoạn 2

### 5.1. Cải thiện Bundle Frontend (Code Splitting)
1. **Phân rã hoàn toàn Monolithic Bundle**: Trước Giai đoạn 2, `index.js` là một khối duy nhất 712 kB raw (195 kB gzip) chứa toàn bộ code của mọi trang trong ứng dụng. Sau Giai đoạn 2, file entry app chỉ còn **79.99 kB raw (24.08 kB gzip)**, giảm **-87,7%**.
2. **Tách biệt Vendor Runtime**: `vendor-react` dung lượng **82.30 kB gzip** được băm hash cố định, cho phép trình duyệt cache vĩnh viễn (`immutable 1 year`), người dùng chỉ cần tải đúng 1 lần cho toàn bộ các phiên truy cập tiếp theo.
3. **Phân rã CSS tự động**: Nhờ lazy loading các route, file CSS chính `index.css` giảm từ **366.56 kB xuống 141.20 kB raw (từ 62.45 kB xuống 24.89 kB gzip)**, các trang nặng như `RpgLibraryWorkspace`, `DeckDetailPage`, `ContextStoryCloze`, `DeckFormModal` đều sở hữu chunk CSS riêng và chỉ được tải về khi người dùng truy cập.
4. **An toàn trước lỗi tải Chunk (Stale Chunks Resiliency)**: `ErrorBoundary` được nâng cấp để tự động phát hiện lỗi dynamic import (thường xảy ra khi một đợt deploy mới xóa các hashed chunk cũ) và kích hoạt tự động reload lại trang 1 lần (dùng cờ `sessionStorage.getItem('chunk_reload_attempted')` ngăn chặn lặp vô hạn). Nút **Tải lại trang** được trang bị sẵn sàng trên giao diện người dùng.
5. **Cơ chế Prefetch thông minh**: Tích hợp `preloadRoute` trên cả 3 thanh điều hướng chính (`AppSidebar`, `MobileBottomNav`, `AppDock`). Ngay khi người dùng di chuột (`hover`) hoặc chuyển phím (`focus`) vào biểu tượng điều hướng, mã nguồn trang tương ứng sẽ được fetch trước ngầm, loại bỏ hoàn toàn độ trễ khi chuyển trang. Mỗi route chỉ được fetch tối đa 1 lần nhờ cơ chế deduplication bằng `Set`.
