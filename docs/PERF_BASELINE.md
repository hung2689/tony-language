# Báo Cáo Đo Baseline Hiệu Năng (Giai Đoạn 0)

> **Mục tiêu**: Thiết lập số liệu hiệu năng thực tế "Trước" (Baseline) trên toàn bộ hệ thống (Backend API, Database Queries, Frontend Bundle & Static Assets) làm chuẩn quy chiếu cho các giai đoạn tối ưu hóa tiếp theo. Logic nghiệp vụ không có bất kỳ thay đổi nào.

---

## 1. Backend & Database Query Baseline

- **Môi trường đo**: Real PostgreSQL 18 (Cơ sở dữ liệu kiểm thử độc lập `language_learning_test`).
- **Tập dữ liệu kiểm chuẩn (Benchmark Dataset)**:
  - 1 Perf User (`perf@languagelearning.com`) + 1 User thứ cấp tạo nhiễu đa người dùng.
  - 20 Vocabulary Sets (Bộ từ vựng).
  - 5.000 Vocabularies chuẩn hóa kèm phiên âm, ngữ cảnh, nghĩa và từ loại.
  - ~5.000 Synonyms (Từ đồng nghĩa).
  - 10.000 Bản ghi Study Progress (SM-2 Spaced Repetition).
  - 2.000 Study Sessions hoàn chỉnh kèm 10.000 Study Answers.
  - 1 Study Plan đang hoạt động (`ACTIVE`) chứa 10 bộ từ vựng (`sort_order` 1..10, `revision = 1`).
- **Phương pháp đo**: Chạy 5 lần độc lập cho mỗi API qua `MockMvc` và Hibernate Statistics, tính giá trị trung vị (**Median**).

| Nhóm chức năng / API Endpoint | Số query DB (Trước) | Thời gian phản hồi (ms) (Trước) | Số query DB (Sau) | Thời gian phản hồi (ms) (Sau) | Ghi chú kỹ thuật |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Ghi nhận học tập theo đợt**:<br>`POST /api/study/sessions` + `POST /api/study/sessions/{id}/answers` (Batch 20 câu) | **188** queries | **488 ms** | *(để trống)* | *(để trống)* | N+1 query nghiêm trọng khi xử lý câu trả lời: mỗi câu trả lời trigger truy vấn load từ vựng, tính toán SM-2, cập nhật StudyProgress và ghi nhận StudyAnswer riêng lẻ. Runs: `[1347ms(188q), 818ms(188q), 361ms(188q), 488ms(188q), 346ms(188q)]`. |
| **Hàng đợi ôn tập hôm nay**:<br>`GET /api/study-plans/current/today` | **5** queries | **111 ms** | *(để trống)* | *(để trống)* | Tải danh sách các thẻ đến hạn trong ngày từ lộ trình 10 bộ. Runs: `[313ms(5q), 150ms(5q), 111ms(5q), 86ms(5q), 88ms(5q)]`. |
| **Chi tiết lộ trình ôn tập hiện tại**:<br>`GET /api/study-plans/current` | **3** queries | **21 ms** | *(để trống)* | *(để trống)* | Đã được tối ưu ở Phase trước với Single-Source SQL aggregate $O(1)$. Runs: `[35ms(3q), 21ms(3q), 21ms(3q), 22ms(3q), 21ms(3q)]`. |
| **Tổng quan thống kê học tập**:<br>`GET /api/analytics/overview` | **2** queries | **7 ms** | *(để trống)* | *(để trống)* | Truy vấn tổng thời gian học, chuỗi ngày streak và tỷ lệ chính xác. Runs: `[19ms(2q), 8ms(2q), 7ms(2q), 7ms(2q), 7ms(2q)]`. |
| **Danh sách từ yếu**:<br>`GET /api/analytics/weak-words?limit=10` | **1** query | **8 ms** | *(để trống)* | *(để trống)* | Truy vấn lọc từ có độ chính xác < 70% và số lần sai > 0. Runs: `[15ms(1q), 9ms(1q), 8ms(1q), 7ms(1q), 4ms(1q)]`. |
| **Phân bổ ghi nhớ retention**:<br>`GET /api/analytics/retention` | **3** queries | **13 ms** | *(để trống)* | *(để trống)* | Thống kê phân loại theo các khoảng ghi nhớ SM-2. Runs: `[19ms(3q), 14ms(3q), 10ms(3q), 13ms(3q), 12ms(3q)]`. |
| **Biểu đồ nhiệt hoạt động**:<br>`GET /api/analytics/heatmap` | **1** query | **8 ms** | *(để trống)* | *(để trống)* | Tổng hợp số thẻ và thời gian học theo từng ngày trong năm. Runs: `[21ms(1q), 6ms(1q), 8ms(1q), 9ms(1q), 7ms(1q)]`. |
| **Toàn bộ Suite Analytics tổng hợp**:<br>`overview` + `weak-words` + `retention` + `heatmap` | **7** queries | **32 ms** | *(để trống)* | *(để trống)* | Khi người dùng truy cập trang thống kê Analytics. Runs: `[32ms(7q), 31ms(7q), 32ms(7q), 39ms(7q), 31ms(7q)]`. |
| **Cập nhật bộ từ lớn**:<br>`PUT /api/decks/{id}` (Batch 500 thẻ) | **2** queries | **136 ms** | *(để trống)* | *(để trống)* | Cập nhật thông tin bộ từ và đồng bộ toàn bộ danh sách 500 thẻ. Runs: `[253ms(2q), 136ms(2q), 135ms(2q), 130ms(2q), 139ms(2q)]`. |
| **Danh sách bộ từ vựng**:<br>`GET /api/decks` | **3** queries | **18 ms** | *(để trống)* | *(để trống)* | Lấy danh sách 20 bộ từ kèm số lượng thẻ đếm từ DB. Runs: `[38ms(3q), 16ms(3q), 21ms(3q), 18ms(3q), 14ms(3q)]`. |

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

## 3. Thư mục Static Assets (`frontend/public`)

- **Tổng số lượng tệp**: **391** tệp
- **Tổng dung lượng thư mục**: **76.521.373 bytes (~72,98 MB)**
- **Nhận định sơ bộ**: Thư mục `public` chứa nhiều video độ phân giải cao và các tệp hình ảnh PNG/JPG trùng lặp (ví dụ: `forest-island.mp4`, `spaced-repetition-paper.png`, `profile-paper-bg.png` xuất hiện ở nhiều thư mục con khác nhau mà không được nén hay tối ưu WebP/AVIF).

### Top 20 tệp có dung lượng lớn nhất trong `frontend/public`:

| STT | Tên tệp | Đường dẫn tương đối | Kích thước thô (Bytes) | Kích thước (KB / MB) |
| :---: | :--- | :--- | :---: | :---: |
| 1 | `13772604_3840_2160_60fps.mp4` | `video\13772604_3840_2160_60fps.mp4` | 23.383.025 | **22,84 MB** |
| 2 | `forest-island.mp4` | `assets\animation\forest-island.mp4` | 3.326.656 | **3,25 MB** |
| 3 | `forest-island.mp4` *(trùng)* | `assets\lexicon\animations\forest-island.mp4` | 3.326.656 | **3,25 MB** |
| 4 | `backgrounddao.png` | `assets\background\backgrounddao.png` | 2.956.262 | **2,89 MB** |
| 5 | `spaced-repetition-paper-raw.png` | `assets\popup\spaced-repetition-paper-raw.png` | 2.645.083 | **2,58 MB** |
| 6 | `background-level-progression.png` | `assets\game-ui\background\background-level-progression.png` | 2.572.003 | **2,51 MB** |
| 7 | `spaced-repetition-paper.png` | `assets\popup\spaced-repetition-paper.png` | 2.347.981 | **2,29 MB** |
| 8 | `spaced-repetition-paper.png` *(trùng)* | `assets\backgrounds\spaced-repetition-paper.png` | 2.347.981 | **2,29 MB** |
| 9 | `background-main-world.png` | `assets\game-ui\background\background-main-world.png` | 2.209.585 | **2,16 MB** |
| 10 | `wallpaper-meadow.jpg` | `wallpapers\wallpaper-meadow.jpg` | 2.183.734 | **2,13 MB** |
| 11 | `background-hero-banner.png` | `assets\game-ui\background\background-hero-banner.png` | 2.081.282 | **2,03 MB** |
| 12 | `wallpaper-forest.jpg` | `wallpapers\wallpaper-forest.jpg` | 1.757.789 | **1,72 MB** |
| 13 | `contact_sheet.png` | `assets\rpg\raw\contact_sheet.png` | 1.399.833 | **1,37 MB** |
| 14 | `wallpaper-valley.jpg` | `wallpapers\wallpaper-valley.jpg` | 1.319.834 | **1,29 MB** |
| 15 | `popup_desktop_raw.png` | `assets\popup\popup_desktop_raw.png` | 912.421 | **891,0 KB** |
| 16 | `auth-bg.png` | `auth-bg.png` | 900.986 | **879,9 KB** |
| 17 | `forecast-parchment-frame.png` | `assets\spaced-repetition\forecast-parchment-frame.png` | 759.193 | **741,4 KB** |
| 18 | `profile-paper-bg.png` | `profile-paper-bg.png` | 730.251 | **713,1 KB** |
| 19 | `profile-paper-bg.png` *(trùng)* | `assets\profile\backgrounds\profile-paper-bg.png` | 730.251 | **713,1 KB** |
| 20 | `profile-paper-bg.png` *(trùng)* | `assets\profile\profile-paper-bg.png` | 730.251 | **713,1 KB** |

---

## 4. Tổng Kết & Điểm Nghẽn Chính Xác Định Được

1. **Backend Bottleneck lớn nhất**: API `POST /api/study/sessions/{id}/answers` khi nộp mảng 20 câu trả lời gây ra tới **188 queries** trong một request (trung bình ~9.4 query/câu trả lời do N+1 loop lặp qua từng thẻ từ và cập nhật SM-2 riêng lẻ), thời gian phản hồi trung vị lên tới **488 ms** (vọt lên tới **1.347 ms** ở lần chạy đầu tiên).
2. **Frontend Bottleneck lớn nhất**: Monolithic chunk `index.js` có dung lượng gzip **195,26 kB** (711,64 kB raw) vượt mức an toàn và toàn bộ tài nguyên static assets ở `public/` nặng tới **72,98 MB** với nhiều tệp video 4K (>22 MB) cùng hàng loạt hình ảnh PNG trùng lặp giữa các thư mục.
