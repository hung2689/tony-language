# Báo Cáo Đo Baseline Hiệu Năng & Kết Quả Tối Ưu (Giai Đoạn 0 - 4)

Tài liệu này ghi nhận toàn diện kết quả đo đạc hiệu năng thực tế của hệ thống Language Learning Platform qua từng giai đoạn (Baseline Giai đoạn 0.5, Giai đoạn 1 Quick Wins, Giai đoạn 2 Frontend Code-Splitting, Giai đoạn 3 Write Paths Batching, và Giai đoạn 4 Read Paths & Security).

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

### 1.1. Bảng Đối Chiếu Chỉ Số Backend: Trước (Baseline 0.5 Gốc) vs Sau (Phase 1 & 2)

*Ghi chú nguồn số liệu*:
- **Cột Trước (Baseline 0.5 Gốc)**: 100% khôi phục nguyên bản từ kết quả đo chuẩn hóa tại commit `e2b4ee6ab2008ef097e0446a7e38f6a4f23a5690`. Lưu ý: Tập dữ liệu của Baseline 0.5 cũ chạy tích lũy không truncate sạch giữa các test, khiến user chạm trần Daily XP (dẫn đến 188 queries thay vì 208 queries) và chưa tính COUNT query phân trang của Spring Data JPA.
- **Cột Sau (Phase 1 & 2)**: Đo thực tế qua `PerfBaselineRunnerIntegrationTest` trên PostgreSQL 18.4 (`language_learning_test`, port 5433).
- **Chỉ số chính & Độ tin cậy**: **Số query** và **Số dòng DB đọc** là các chỉ số chính có tính **xác định (deterministic)**, lặp lại giống nhau 100% qua mọi lần chạy độc lập. **Thời gian thực thi (ms)** chỉ mang tính tham khảo và nằm trong dải nhiễu dao động của CPU/hệ điều hành.

| Nhóm chức năng / API Endpoint | Chế độ | Số query (Trước 0.5) | Batch Lần / Dòng (Trước) | Dòng DB đọc (Trước) | Thời gian (Trước 0.5) | Response Size (Trước) | Số query (Sau P1/P2) | Batch Lần / Dòng (Sau) | Dòng DB đọc (Sau) | Thời gian (Sau P1/P2) | Response Size (Sau) | Ghi chú kỹ thuật & Đánh giá thay đổi |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Ghi nhận học tập theo đợt**:<br>`POST /api/study/sessions`<br>+ `POST /sessions/{id}/answers`<br>(Batch 20 câu) | **COLD**<br>**WARM** | 188 q<br>188 q | 0 (0 r)<br>0 (0 r) | 75 r<br>75 r | 1.026 ms<br>483 ms | 712 B<br>715 B | **208 q**<br>**208 q** | **1 (1 r)**<br>**1 (1 r)** | **75 r**<br>**75 r** | **1.213 ms**<br>**374 ms** | 718 B<br>721 B | Hibernate statement batching kích hoạt `b:1(1)` cho session. Vấn đề N+1 query lặp 20 câu sẽ được giải quyết triệt để ở Giai đoạn 3 (Batch SM-2 rewrite). |
| **Hàng đợi ôn tập hôm nay**:<br>`GET /api/study-plans/current/today` | **COLD**<br>**WARM** | 5 q<br>5 q | 0 (0 r)<br>0 (0 r) | 2.831 r<br>2.831 r | 350 ms<br>125 ms | 15.628 B<br>15.628 B | **5 q**<br>**5 q** | **0 (0 r)**<br>**0 (0 r)** | **6.761 r**<br>**6.761 r** | **497 ms**<br>**246 ms** | 545.899 B<br>545.899 B | Duy trì 5 queries. Đọc dữ liệu thẻ lên memory để lọc thẻ đến hạn; ở Giai đoạn 4 đã chọn giữ bản in-memory (đơn giản, an toàn, không phụ thuộc CTE) và bổ sung endpoint siêu nhẹ `GET /today/summary` (2 q, 2 r, 336 B) phục vụ hiển thị số đếm cho toàn bộ UI. |
| **Chi tiết lộ trình ôn tập hiện tại**:<br>`GET /api/study-plans/current` | **COLD**<br>**WARM** | 3 q<br>3 q | 0 (0 r)<br>0 (0 r) | 12 r<br>12 r | 48 ms<br>23 ms | 1.573 B<br>1.573 B | **3 q**<br>**3 q** | **0 (0 r)**<br>**0 (0 r)** | **12 r**<br>**12 r** | **74 ms**<br>**60 ms** | 1.592 B<br>1.592 B | Single-source SQL aggregate $O(1)$ từ sprint trước, duy trì ổn định 3 queries và đọc đúng 12 dòng. |
| **Tổng quan thống kê học tập**:<br>`GET /api/analytics/overview` | **COLD**<br>**WARM** | 2 q<br>2 q | 0 (0 r)<br>0 (0 r) | 69 r<br>69 r | 15 ms<br>10 ms | 290 B<br>290 B | **2 q**<br>**2 q** | **0 (0 r)**<br>**0 (0 r)** | **7.000 r**<br>**7.000 r** | **143 ms**<br>**99 ms** | 301 B<br>301 B | 2 queries ổn định; đọc đúng 7.000 dòng trên tập dữ liệu benchmark độc lập. |
| **Danh sách từ yếu**:<br>`GET /api/analytics/weak-words?limit=10` | **COLD**<br>**WARM** | 1 q<br>1 q | 0 (0 r)<br>0 (0 r) | 20 r<br>20 r | 14 ms<br>5 ms | 124 B<br>124 B | **2 q**<br>**2 q** | **0 (0 r)**<br>**0 (0 r)** | **5.010 r**<br>**5.010 r** | **139 ms**<br>**76 ms** | 2.147 B<br>2.147 B | Truy vấn từ yếu phân trang (thêm COUNT query), đọc 5.010 dòng. |
| **Phân bổ ghi nhớ retention**:<br>`GET /api/analytics/retention` | **COLD**<br>**WARM** | 3 q<br>3 q | 0 (0 r)<br>0 (0 r) | 48 r<br>48 r | 17 ms<br>11 ms | 215 B<br>215 B | **3 q**<br>**3 q** | **0 (0 r)**<br>**0 (0 r)** | **5.024 r**<br>**5.024 r** | **108 ms**<br>**83 ms** | 219 B<br>219 B | 3 queries ổn định. |
| **Biểu đồ nhiệt hoạt động**:<br>`GET /api/analytics/heatmap` | **COLD**<br>**WARM** | 1 q<br>1 q | 0 (0 r)<br>0 (0 r) | 49 r<br>49 r | 22 ms<br>7 ms | 320 B<br>320 B | **1 q**<br>**1 q** | **0 (0 r)**<br>**0 (0 r)** | **2.000 r**<br>**2.000 r** | **39 ms**<br>**20 ms** | 6.930 B<br>6.930 B | 1 query duy nhất quét 2.000 sessions học tập. |
| **Analytics Suite (Toàn bộ 4 API)** | **COLD**<br>**WARM** | 7 q<br>7 q | 0 (0 r)<br>0 (0 r) | 186 r<br>186 r | 34 ms<br>26 ms | 949 B<br>949 B | **8 q**<br>**8 q** | **0 (0 r)**<br>**0 (0 r)** | **19.034 r**<br>**19.034 r** | **244 ms**<br>**234 ms** | 9.597 B<br>9.594 B | Tổng hợp 4 endpoint analytics. Cột Trước khôi phục đúng 34 ms / 26 ms từ bản 0.5 gốc (commit `e2b4ee6`). |
| **PUT Deck (a: Sửa 500 thẻ có sẵn)**:<br>`PUT /api/decks/{id}` | **COLD**<br>**WARM** | 2.503 q<br>2.502 q | 0 (0 r)<br>0 (0 r) | 1.501 r<br>1.501 r | 2.552 ms<br>1.301 ms | 132.901 B<br>132.901 B | **2.502 q**<br>**2.501 q** | **1.000 (1.001 r)**<br>**999 (1.000 r)** | **1.501 r**<br>**1.501 r** | **2.678 ms**<br>**1.726 ms** | 133.404 B<br>133.401 B | 999 lần `executeBatch` cho 1.000 dòng nghĩa là hầu hết mỗi batch chỉ chứa đúng 1 dòng (batch size = 1), không mang lại lợi ích gom đợt thực sự; hướng xử lý là Giai đoạn 3.1 (chuyển sang bulk JDBC update). Thời gian tăng: chưa xác định, nghi nhiễu máy hoặc overhead của batch cỡ 1 (không khẳng định do batching). |
| **PUT Deck (b: Thêm 500 thẻ mới)**:<br>`PUT /api/decks/{id}` | **COLD**<br>**WARM** | 6 q<br>5 q | 0 (0 r)<br>0 (0 r) | 501 r<br>501 r | 90 ms<br>77 ms | 125.402 B<br>125.399 B | **6 q**<br>**5 q** | **1 (1 r)**<br>**0 (0 r)** | **501 r**<br>**501 r** | **73 ms**<br>**128 ms** | 125.902 B<br>125.899 B | **Không đổi so với 0.5** (duy trì 5-6 queries, đường bulk insert đa dòng `createCardsForDeckBatch` qua JdbcTemplate đã có từ trước, không phải cải thiện mới của Giai đoạn 1 hay 2). |
| **PUT Deck (c: Xóa 500 thẻ khỏi deck)**:<br>`PUT /api/decks/{id}` | **COLD**<br>**WARM** | 10 q<br>9 q | 0 (0 r)<br>0 (0 r) | 504 r<br>504 r | 57 ms<br>49 ms | 585 B<br>585 B | **10 q**<br>**9 q** | **3 (3 r)**<br>**2 (2 r)** | **504 r**<br>**504 r** | **128 ms**<br>**74 ms** | 589 B<br>586 B | Duy trì 9 queries warm, 504 dòng đọc. Cột Trước khôi phục đúng 57 ms / 49 ms từ bản 0.5 gốc (commit `e2b4ee6`). |
| **Get List Decks**:<br>`GET /api/decks` | **COLD**<br>**WARM** | 3 q<br>3 q | 0 (0 r)<br>0 (0 r) | 54 r<br>54 r | 24 ms<br>9 ms | 6.710 B<br>6.710 B | **3 q**<br>**3 q** | **0 (0 r)**<br>**0 (0 r)** | **45 r**<br>**45 r** | **29 ms**<br>**8 ms** | 5.912 B<br>5.912 B | Duy trì 3 queries ổn định. Đọc 45 dòng (gồm 23 bộ từ và aggregate counts trên tập dữ liệu benchmark độc lập sau truncate & seed sạch). Cột Trước khôi phục đúng 54 r / 6.710 B từ bản 0.5 gốc (commit `e2b4ee6`). |

---

### 1.2. Baseline B1 – Dùng Cho Giai Đoạn 3 Trở Đi

Mục này chốt chính thức bộ chỉ số **Baseline B1** – mốc đo lường chuẩn xác, có tính tái lập 100% trên cùng tập dữ liệu sạch, dùng làm mốc so sánh trực tiếp cho toàn bộ các tối ưu hóa backend từ Giai đoạn 3 trở đi.

#### 1.2.1. Quy Cách Tập Dữ Liệu Kiểm Chuẩn B1 (Verified Database Counts)
Mỗi kịch bản trước khi chạy đều được truncate sạch và seed lại đúng chuẩn qua `PerfDataSeeder` và được kiểm chứng qua `TestDatabaseSafetyGuard`:
1. `vocabularies`: **5.501 dòng** (5.000 seeder baseline + 501 thẻ dành riêng cho kịch bản PUT deck benchmark).
2. `vocabulary_sets`: **23 dòng** (20 seeder baseline + 3 bộ thẻ dành riêng cho PUT deck benchmark).
3. `study_progress`: **10.000 dòng**.
4. `study_sessions`: **2.000 dòng**.
5. `study_answers`: **10.000 dòng**.

#### 1.2.2. Bảng Chỉ Số Chuẩn Baseline B1 (Đo Thực Tế Trên PostgreSQL 18.4)

*Ghi chú*: Số query, số lần batch, số dòng đọc và dung lượng response là các chỉ số **xác định 100% (deterministic)**. Thời gian thực thi ghi nhận từ các lần đo độc lập (1 Cold + 5 Warm Runs lấy giá trị trung vị).

| STT | Nhóm chức năng / API Endpoint | Chế độ | Số query | Batch (Lần / Dòng) | Số dòng DB đọc | Thời gian thực thi (ms) | Response Payload | Ghi chú kiến trúc & Điểm nghẽn cần tối ưu ở Giai đoạn 3+ |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 1a | **Ghi nhận 20 câu trả lời**:<br>`POST /api/study/sessions`<br>+ `POST /answers` (20 câu)<br>*(Trạng thái: Chưa chạm cap XP)* | **COLD**<br>**WARM** | **208 q**<br>**208 q** | **1 (1 r)**<br>**1 (1 r)** | **75 r**<br>**75 r** | 1.345 - 1.482 ms<br>464 - 526 ms | 717 - 723 B<br>723 B | **Nghẽn nghiêm trọng (208 queries / 20 câu)** do SM-2 và XP check lặp từng câu. Khi user chưa chạm Daily XP Cap, mỗi câu sinh thêm 1 query `INSERT/UPDATE user_xp` qua `addXpAtomic` (+20 queries = 208 queries). Cần viết lại Bulk SM-2 ở Giai đoạn 3. |
| 1b | **Ghi nhận 20 câu trả lời**:<br>`POST /api/study/sessions`<br>+ `POST /answers` (20 câu)<br>*(Trạng thái: Đã chạm cap XP)* | **COLD**<br>**WARM** | **188 q**<br>**188 q** | **1 (1 r)**<br>**1 (1 r)** | **75 r**<br>**75 r** | 401 ms<br>303 ms | 720 B<br>723 B | **188 queries** (-20 queries so với 1a). Do user đã đạt trần Daily XP (500 XP), `XpService` tính `actualXp = 0` nên bỏ qua bước gọi `userXpRepository.addXpAtomic` cho cả 20 câu. |
| 2 | **Hàng đợi ôn tập hôm nay**:<br>`GET /api/study-plans/current/today`<br>*(1.750 thẻ: 1.250 due + 500 weak)* | **COLD**<br>**WARM** | **5 q**<br>**5 q** | **0 (0 r)**<br>**0 (0 r)** | **6.761 r**<br>**6.761 r** | 548 - 761 ms<br>228 - 246 ms | 545.897 - 545.900 B<br>545.900 B (~545 KB raw,<br>32.533 B gzip -94,0%) | **Nghẽn bộ nhớ & mạng (545 KB, 6.761 dòng DB đọc, 1.750 thẻ)**. Load toàn bộ từ vựng lên RAM Java để phân loại due/weak/new. Cần chuyển sang SQL Window Functions / Pagination ở Giai đoạn 4. |
| 3 | **Chi tiết lộ trình ôn tập**:<br>`GET /api/study-plans/current` | **COLD**<br>**WARM** | **3 q**<br>**3 q** | **0 (0 r)**<br>**0 (0 r)** | **12 r**<br>**12 r** | 75 - 91 ms<br>46 - 69 ms | 1.600 - 1.603 B<br>1.603 B | Đã tối ưu hóa single-source SQL $O(1)$, chỉ đọc đúng 12 dòng. |
| 4 | **Thống kê tổng quan**:<br>`GET /api/analytics/overview` | **COLD**<br>**WARM** | **2 q**<br>**2 q** | **0 (0 r)**<br>**0 (0 r)** | **7.000 r**<br>**7.000 r** | 149 - 159 ms<br>111 - 119 ms | 298 - 301 B<br>301 B | 2 queries, đọc 7.000 dòng. |
| 5 | **Danh sách từ yếu**:<br>`GET /api/analytics/weak-words?limit=10` | **COLD**<br>**WARM** | **2 q**<br>**2 q** | **0 (0 r)**<br>**0 (0 r)** | **5.010 r**<br>**5.010 r** | 93 - 302 ms<br>69 - 99 ms | 2.147 B<br>2.147 B | 2 queries (1 query COUNT(*) phân trang của Spring Data JPA + 1 query SELECT data LIMIT 10). |
| 6 | **Tỷ lệ ghi nhớ retention**:<br>`GET /api/analytics/retention` | **COLD**<br>**WARM** | **3 q**<br>**3 q** | **0 (0 r)**<br>**0 (0 r)** | **5.024 r**<br>**5.024 r** | 90 - 154 ms<br>65 - 110 ms | 219 B<br>219 B | 3 queries ổn định. |
| 7 | **Biểu đồ nhiệt 365 ngày**:<br>`GET /api/analytics/heatmap` | **COLD**<br>**WARM** | **1 q**<br>**1 q** | **0 (0 r)**<br>**0 (0 r)** | **2.000 r**<br>**2.000 r** | 39 - 42 ms<br>25 - 29 ms | 6.930 B<br>6.930 B | 1 query duy nhất quét 2.000 sessions. |
| 8 | **Analytics Suite (Toàn bộ 4 API)** | **COLD**<br>**WARM** | **8 q**<br>**8 q** | **0 (0 r)**<br>**0 (0 r)** | **19.034 r**<br>**19.034 r** | 254 - 255 ms<br>232 ms | 9.594 - 9.597 B<br>9.594 - 9.597 B | Tổng cộng 8 queries (2 + 2 + 3 + 1), đọc 19.034 dòng. |
| 9 | **PUT Deck (a: Sửa 500 thẻ có sẵn)**:<br>`PUT /api/decks/{id}` | **COLD**<br>**WARM** | **2.502 q**<br>**2.501 q** | **1.000 (1.001 r)**<br>**999 (1.000 r)** | **1.501 r**<br>**1.501 r** | 2.839 - 2.855 ms<br>1.958 - 2.271 ms | 133.402 - 133.405 B<br>133.402 B (~133 KB) | **Nghẽn nghiêm trọng (2.501 queries)** do Hibernate dirty checking và entity lookup lặp từng thẻ. Batch 999 lần cho 1.000 dòng là batch cỡ 1. Cần thay bằng Spring JdbcTemplate batch update ở Giai đoạn 3.1. |
| 10 | **PUT Deck (b: Thêm 500 thẻ mới)**:<br>`PUT /api/decks/{id}` | **COLD**<br>**WARM** | **6 q**<br>**5 q** | **1 (1 r)**<br>**0 (0 r)** | **501 r**<br>**501 r** | 129 - 251 ms<br>106 - 111 ms | 125.903 B<br>125.900 B (~125 KB) | Duy trì 5 queries, sử dụng đường dẫn multi-row insert có sẵn. |
| 11 | **PUT Deck (c: Xóa 500 thẻ khỏi deck)**:<br>`PUT /api/decks/{id}` | **COLD**<br>**WARM** | **10 q**<br>**9 q** | **3 (3 r)**<br>**2 (2 r)** | **504 r**<br>**504 r** | 63 - 86 ms<br>44 - 71 ms | 590 B<br>587 B | Duy trì 9 queries warm, 504 dòng đọc. |
| 12 | **Danh sách bộ từ vựng**:<br>`GET /api/decks` | **COLD**<br>**WARM** | **3 q**<br>**3 q** | **0 (0 r)**<br>**0 (0 r)** | **45 r**<br>**45 r** | 27 - 47 ms<br>9 - 16 ms | 5.935 B<br>5.935 B | 3 queries ổn định, đọc 45 dòng (23 decks + folders + item count group by). |

#### 1.2.3. Phân Tích Chuyên Sâu Payload `GET /api/study-plans/current/today` (~545 KB)
Trong Baseline B1, endpoint `GET /api/study-plans/current/today` trả về payload rất lớn: **545.900 bytes (~545 KB)** cho **6.761 dòng DB đọc**.

1. **Cấu trúc trường của `TermCardDto`**:
   - `id`: `Long` (mã định danh từ vựng).
   - `term`: `String` (từ tiếng Anh).
   - `definition`: `String` (nghĩa tiếng Việt).
   - `pronunciation`: `String` (phiên âm IPA).
   - `partOfSpeech`: `String` (từ loại).
   - `example`: `String` (câu ví dụ tiếng Anh, lấy từ `v.getExampleSentence()`).
   - `synonyms`: `List<String>` (danh sách từ đồng nghĩa).
   - `lastReviewedAt`, `intervalDays`, `repetitions`: giá trị `null` trong hàng đợi hôm nay.

2. **Phân tích trường `exampleParagraph` (Đoạn văn ví dụ)**:
   - Trong entity cơ sở dữ liệu `Vocabulary.java`, có trường `exampleParagraph` (`TEXT`, đoạn văn tiếng Anh dài ~200 - 500 ký tự).
   - Tuy nhiên, trong DTO trả về `TermCardDto.java`, trường `exampleParagraph` **KHÔNG được khai báo và không được serialize ra JSON** (chỉ có trường `example` chứa câu ví dụ đơn `exampleSentence`).
   - Quét toàn bộ mã nguồn frontend (`frontend/src`): **hoàn toàn KHÔNG CÓ trường `exampleParagraph`** (0 kết quả tìm kiếm).

3. **Nguyên nhân thực tế của dung lượng ~545 KB & Kiểm đếm thực tế (Verified Audit)**:
   - Cơ sở dữ liệu đọc **6.761 dòng** qua các bảng `vocabularies`, `study_progress`, `vocabulary_synonyms`.
   - Sau khi deduplicate theo `normalizeWord` và phân loại SM-2 trong bộ nhớ, hàng đợi chọn ra **1.750 thẻ** (`cards.length = 1.750`), bao gồm:
     - **1.250 thẻ đến hạn ôn tập** (`dueCount = 1.250`).
     - **500 thẻ yếu cần củng cố** (`weakCount = 500`).
     - **0 thẻ mới** (`newCount = 0`).
     - **0 thẻ khác** (`otherCount = 0`).
     - Tổng cộng: **1.750 thẻ** (`totalCount = 1.750`).
   - Dung lượng JSON thô (raw): **545.900 bytes (~533,11 KB)**, trung bình ~312 bytes/thẻ JSON.
   - Dung lượng khi nén Gzip (`Accept-Encoding: gzip`): **32.533 bytes (~31,77 KB)**, giảm **-94,0%** băng thông mạng!

4. **Kiểm tra mức độ sử dụng ở Frontend**:
   - Các component hiển thị chính: `DailyGateReminder.jsx`, `AppDock.jsx`, `SpacedRepetitionCard.jsx`, `StudyPlanPage.jsx` gọi `getTodayQueue()` **CHỈ ĐỂ LẤY CÁC TRƯỜNG ĐẾM TỔNG QUAN**:
     - `todayQueue.totalWords`
     - `todayQueue.dueWords`
     - `todayQueue.weakWords`
     - `todayQueue.newWords`
     Các component này **hoàn toàn không dùng đến mảng `cards`** nhưng vẫn phải tải 545 KB JSON qua mạng ở mọi lần load trang!
   - Chỉ duy nhất trang học thực sự `TodayLearnPage.jsx` mới sử dụng mảng `cards` để truyền vào `useLearnSession`.
   - **Đề xuất tối ưu hóa cho Giai đoạn 4**: Tách riêng endpoint nhẹ `GET /api/study-plans/current/today-summary` (chỉ trả 4 trường đếm số lượng, dung lượng < 100 bytes) cho Dashboard/AppDock; và áp dụng phân trang hoặc chỉ tải thẻ của phiên học (daily session queue) khi người dùng bấm vào học.

### 1.3. Baseline B2 – Sau Giai Đoạn 3 (Commit Merge `775ff98`)

Chốt bộ chỉ số **Baseline B2** sau khi hoàn thành Giai đoạn 3 (Batch hóa các đường ghi nóng `recordAnswers` và `updateDeck`), đo trực tiếp trên PostgreSQL 18.4 cùng tập dữ liệu chuẩn B1 (5.501 vocabularies, 23 sets, 10.000 progress, 2.000 sessions, 10.000 answers).

| STT | Nhóm chức năng / API Endpoint | Chế độ | Số query | Batch (Lần / Dòng) | Số dòng DB đọc | Thời gian (ms) | Response Payload (Raw / Gzip) | Đánh giá trạng thái tại mốc B2 |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 1a | **Ghi nhận 20 câu**:<br>`POST /sessions` + `POST /answers`<br>*(Chưa chạm cap XP)* | **COLD**<br>**WARM** | **15 q**<br>**15 q** | **3 (41 r)**<br>**3 (41 r)** | **64 r**<br>**64 r** | 571 - 861 ms<br>46 - 77 ms | 722 - 725 B<br>(gzip: 274 B) | Giảm từ 208 queries (B1) xuống 15 queries (-92,8%). Batching 3 lần: 20 answers + 20 progress + 1 xp event = 41 dòng. |
| 1b | **Ghi nhận 20 câu**:<br>`POST /sessions` + `POST /answers`<br>*(Đã chạm cap XP)* | **COLD**<br>**WARM** | **14 q**<br>**14 q** | **3 (41 r)**<br>**3 (41 r)** | **64 r**<br>**64 r** | 71 - 98 ms<br>56 - 84 ms | 725 B<br>(gzip: 273 B) | 14 queries (bỏ qua query cộng dồn `user_xp`). |
| 1c | **Ghi nhận 100 câu**:<br>`POST /sessions` + `POST /answers`<br>*(Chưa chạm cap XP)* | **COLD**<br>**WARM** | **15 q**<br>**15 q** | **3 (201 r)**<br>**3 (201 r)** | **304 r**<br>**304 r** | 97 - 215 ms<br>80 - 120 ms | 724 - 727 B<br>(gzip: 274 B) | Chứng minh $O(1)$ query: 100 câu vẫn tốn đúng 15 queries. Batch 3 lần = 201 dòng. |
| 1d | **Ghi nhận 100 câu**:<br>`POST /sessions` + `POST /answers`<br>*(Đã chạm cap XP)* | **COLD**<br>**WARM** | **14 q**<br>**14 q** | **3 (201 r)**<br>**3 (201 r)** | **304 r**<br>**304 r** | 69 - 141 ms<br>67 - 81 ms | 724 - 727 B<br>(gzip: 274 B) | Giữ nguyên 14 queries khi tăng lên 100 câu. |
| 1e | **Khởi tạo session độc lập**:<br>`POST /api/study/sessions` (Không gate) | **COLD**<br>**WARM** | **4 q**<br>**4 q** | **0 (0 r)**<br>**0 (0 r)** | **2 r**<br>**2 r** | 12 - 16 ms<br>12 - 14 ms | 359 - 362 B<br>(gzip: 274 - 276 B) | 4 queries: 1 check active plan gate, 1 check deck owner, 1 count items, 1 insert session. |
| 1f | **Khởi tạo session độc lập**:<br>`POST /api/study/sessions` (Hard gate) | **COLD**<br>**WARM** | **2 q**<br>**2 q** | **0 (0 r)**<br>**0 (0 r)** | **2 r**<br>**2 r** | 43 - 69 ms<br>16 - 42 ms | 237 B<br>(gzip: 234 - 235 B) | Chặn $O(1)$: `hasCardsToStudyToday` dùng `SELECT EXISTS (...) LIMIT 1` trả 400 Bad Request ngay. |
| 1g | **Đo riêng `recordAnswers` (20 câu)**<br>*(Chưa chạm cap XP)* | **COLD**<br>**WARM** | **11 q**<br>**11 q** | **3 (41 r)**<br>**3 (41 r)** | **62 r**<br>**62 r** | 18 - 20 ms<br>20 - 32 ms | 360 - 363 B<br>(gzip: 273 - 274 B) | **Đo riêng lẻ: ĐẠT mục tiêu $\le 12$ queries** (11 queries). |
| 1h | **Đo riêng `recordAnswers` (20 câu)**<br>*(Đã chạm cap XP)* | **COLD**<br>**WARM** | **10 q**<br>**10 q** | **3 (41 r)**<br>**3 (41 r)** | **62 r**<br>**62 r** | 13 - 36 ms<br>16 - 32 ms | 363 B<br>(gzip: 273 - 274 B) | **Đo riêng lẻ: ĐẠT mục tiêu $\le 12$ queries** (10 queries). |
| 1i | **Đo riêng `recordAnswers` (100 câu)**<br>*(Chưa chạm cap XP)* | **COLD**<br>**WARM** | **11 q**<br>**11 q** | **3 (201 r)**<br>**3 (201 r)** | **302 r**<br>**302 r** | 49 - 81 ms<br>44 - 67 ms | 365 B<br>(gzip: 273 - 274 B) | **Đo riêng lẻ: ĐẠT mục tiêu $\le 12$ queries** (11 queries). |
| 1j | **Đo riêng `recordAnswers` (100 câu)**<br>*(Đã chạm cap XP)* | **COLD**<br>**WARM** | **10 q**<br>**10 q** | **3 (201 r)**<br>**3 (201 r)** | **302 r**<br>**302 r** | 55 - 81 ms<br>57 - 77 ms | 365 B<br>(gzip: 274 - 275 B) | **Đo riêng lẻ: ĐẠT mục tiêu $\le 12$ queries** (10 queries). |
| 2 | **Hàng đợi ôn tập hôm nay**:<br>`GET /api/study-plans/current/today` | **COLD**<br>**WARM** | **5 q**<br>**5 q** | **0 (0 r)**<br>**0 (0 r)** | **6.761 r**<br>**6.761 r** | 632 - 1.135 ms<br>239 - 466 ms | 547.650 B<br>(gzip: 31.996 - 32.485 B) | Chưa tối ưu ở B2: Nạp toàn bộ lên RAM Java để phân loại, payload nặng ~547 KB. |
| 3 | **Chi tiết lộ trình ôn tập**:<br>`GET /api/study-plans/current` | **COLD**<br>**WARM** | **3 q**<br>**3 q** | **0 (0 r)**<br>**0 (0 r)** | **12 r**<br>**12 r** | 105 - 202 ms<br>56 - 83 ms | 1.603 B<br>(gzip: 570 - 571 B) | Đã tối ưu single-source SQL $O(1)$ từ trước. |
| 4 | **Thống kê tổng quan**:<br>`GET /api/analytics/overview` | **COLD**<br>**WARM** | **2 q**<br>**2 q** | **0 (0 r)**<br>**0 (0 r)** | **7.000 r**<br>**7.000 r** | 125 - 222 ms<br>93 - 179 ms | 301 B<br>(gzip: 237 - 238 B) | Nạp toàn bộ 7.000 dòng lên Java RAM. |
| 5 | **Danh sách từ yếu**:<br>`GET /api/analytics/weak-words?limit=10` | **COLD**<br>**WARM** | **2 q**<br>**2 q** | **0 (0 r)**<br>**0 (0 r)** | **5.010 r**<br>**5.010 r** | 95 - 187 ms<br>84 - 165 ms | 2.157 B<br>(gzip: 369 - 371 B) | Nạp 5.010 dòng lên Java RAM để sort in-memory. |
| 6 | **Tỷ lệ ghi nhớ retention**:<br>`GET /api/analytics/retention` | **COLD**<br>**WARM** | **3 q**<br>**3 q** | **0 (0 r)**<br>**0 (0 r)** | **5.024 r**<br>**5.024 r** | 82 - 195 ms<br>79 - 177 ms | 219 B<br>(gzip: 199 - 200 B) | Nạp 5.024 dòng lên Java RAM. |
| 7 | **Biểu đồ nhiệt 365 ngày**:<br>`GET /api/analytics/heatmap` | **COLD**<br>**WARM** | **1 q**<br>**1 q** | **0 (0 r)**<br>**0 (0 r)** | **2.000 r**<br>**2.000 r** | 37 - 54 ms<br>20 - 47 ms | 6.930 B<br>(gzip: 473 - 474 B) | Nạp 2.000 sessions lên Java RAM. |
| 8 | **Analytics Suite (Toàn bộ 4 API)** | **COLD**<br>**WARM** | **8 q**<br>**8 q** | **0 (0 r)**<br>**0 (0 r)** | **19.034 r**<br>**19.034 r** | 220 - 328 ms<br>232 - 291 ms | 9.604 - 9.607 B<br>(gzip: 1.278 - 1.283 B) | Tổng cộng 8 queries, đọc 19.034 dòng. |
| 9 | **PUT Deck (a: Sửa 500 thẻ có sẵn)**:<br>`PUT /api/decks/{id}` | **COLD**<br>**WARM** | **8 q**<br>**7 q** | **3 (1.001 r)**<br>**2 (1.000 r)** | **1.501 r**<br>**1.501 r** | 208 - 273 ms<br>127 - 196 ms | 133.902 - 133.905 B<br>(gzip: 7.914 - 8.083 B) | Bulk JDBC Update: Giảm từ 2.501 queries (B1) xuống 7 queries (-99,7%). 1.000 dòng được batch gom đúng 2 lần. |
| 10 | **PUT Deck (a': Sửa 500 thẻ không đổi)**:<br>`PUT /api/decks/{id}` | **COLD**<br>**WARM** | **4 q**<br>**4 q** | **0 (0 r)**<br>**0 (0 r)** | **1.501 r**<br>**1.501 r** | 27 - 42 ms<br>29 - 101 ms | 119.021 B<br>(gzip: 6.497 - 6.590 B) | Diff in-memory: 0 batch update, 4 queries đọc. |
| 11 | **PUT Deck (b: Thêm 500 thẻ mới)**:<br>`PUT /api/decks/{id}` | **COLD**<br>**WARM** | **6 q**<br>**5 q** | **1 (1 r)**<br>**0 (0 r)** | **501 r**<br>**501 r** | 70 - 95 ms<br>73 - 83 ms | 126.400 - 126.403 B<br>(gzip: 7.888 - 8.036 B) | Duy trì tối ưu có sẵn: multi-row bulk insert. |
| 12 | **PUT Deck (c: Xóa 500 thẻ)**:<br>`PUT /api/decks/{id}` | **COLD**<br>**WARM** | **10 q**<br>**9 q** | **3 (3 r)**<br>**2 (2 r)** | **504 r**<br>**504 r** | 47 - 76 ms<br>33 - 51 ms | 588 - 591 B<br>(gzip: 409 - 413 B) | Duy trì tối ưu có sẵn: 9 queries warm, 504 dòng đọc. |
| 13 | **Danh sách bộ từ vựng**:<br>`GET /api/decks` | **COLD**<br>**WARM** | **3 q**<br>**3 q** | **0 (0 r)**<br>**0 (0 r)** | **45 r**<br>**45 r** | 24 - 34 ms<br>7 - 15 ms | 5.935 B<br>(gzip: 664 - 671 B) | 3 queries ổn định. |

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

### 3.1. Top 20 Tệp Dung Lượng Lớn Nhất Trong `frontend/public` (Trạng Thái SAU Tối Ưu Phase 1 - Quét Thực Tế)

*Nguồn số liệu*: Quét trực tiếp toàn bộ cây thư mục `frontend/public` bằng Node.js fs stat, đếm số lần xuất hiện chính xác của tên file trong toàn bộ mã nguồn `frontend/src`.

| STT | Tên tệp | Đường dẫn tương đối | Dung lượng (Bytes) | Kích thước hiển thị | Số tham chiếu trong `src/` | Chi tiết / Vị trí tham chiếu trong mã nguồn |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| 1 | `forest-island.mp4` | `assets/animation/forest-island.mp4` | 3.326.656 | **3.17 MB** | **1** | `features/library/components/WorldMap.jsx:167` (Background video canvas bản đồ thế giới RPG) |
| 2 | `wallpaper-meadow.webp` | `wallpapers/wallpaper-meadow.webp` | 1.057.072 | **1.01 MB** | **6** | `features/wallpapers/WallpaperContext.jsx` (3), `features/wallpapers/__tests__/WallpaperMigration.test.jsx` (3) |
| 3 | `wallpaper-forest.webp` | `wallpapers/wallpaper-forest.webp` | 838.324 | **818.68 KB** | **6** | `features/wallpapers/WallpaperContext.jsx` (3), `features/wallpapers/__tests__/WallpaperMigration.test.jsx` (3) |
| 4 | `wallpaper-valley.webp` | `wallpapers/wallpaper-valley.webp` | 514.880 | **502.81 KB** | **7** | `App.css` (1), `features/wallpapers/WallpaperContext.jsx` (3), `features/wallpapers/__tests__/WallpaperMigration.test.jsx` (3) |
| 5 | `spaced-repetition-paper.webp` | `assets/popup/spaced-repetition-paper.webp` | 197.212 | **192.59 KB** | **1** | `features/studyplan/SpacedRepetitionForecastModal.css` (1) |
| 6 | `backgrounddao.webp` | `assets/background/backgrounddao.webp` | 193.134 | **188.61 KB** | **2** | `features/library/lexiconMapData.js` (1), `features/library/RpgLibraryWorkspace.css` (1) |
| 7 | `forest-island-mask.png` | `assets/animation/forest-island-mask.png` | 93.466 | **91.28 KB** | **2** | `features/library/RpgLibraryWorkspace.css` (2) |
| 8 | `texture_watercolor_wash_blue.png` | `assets/nen_texture/texture_watercolor_wash_blue.png` | 88.543 | **86.47 KB** | **1** | `features/library/lexiconMapData.js` (1) |
| 9 | `ornament_red_compass_stamp.png` | `assets/nen_texture/ornament_red_compass_stamp.png` | 77.423 | **75.61 KB** | **1** | `features/library/lexiconMapData.js` (1) |
| 10 | `texture_parchment_edge_vertical.png` | `assets/nen_texture/texture_parchment_edge_vertical.png` | 71.993 | **70.31 KB** | **1** | `features/library/lexiconMapData.js` (1) |
| 11 | `ornament_compass_rose.png` | `assets/nen_texture/ornament_compass_rose.png` | 69.318 | **67.69 KB** | **2** | `features/library/lexiconMapData.js` (1), `features/studyplan/SpacedRepetitionForecastModal.jsx` (1) |
| 12 | `rank-supreme.png` | `assets/badges/rank-supreme.png` | 63.527 | **62.04 KB** | **5** | `utils/ranks.js` (2), `utils/__tests__/ranks.test.js` (3) |
| 13 | `profile-ship-illustration.webp` | `assets/profile/profile-ship-illustration.webp` | 62.682 | **61.21 KB** | **1** | `features/profile/ProfilePage.jsx` (1) |
| 14 | `ornament_green_ribbon.png` | `assets/nen_texture/ornament_green_ribbon.png` | 57.690 | **56.34 KB** | **1** | `features/library/lexiconMapData.js` (1) |
| 15 | `sign_wooden_blank.png` | `assets/nen_texture/sign_wooden_blank.png` | 57.376 | **56.03 KB** | **1** | `features/library/lexiconMapData.js` (1) |
| 16 | `vintage-map-bg.webp` | `assets/flashcard/vintage-map-bg.webp` | 56.678 | **55.35 KB** | **5** | `features/decks/DeckDetailPage.css` (2), `features/learn/Learn.css` (1), `features/learn/__tests__/LearnFeedbackRedesign.test.jsx` (2) |
| 17 | `rank-legendary.png` | `assets/badges/rank-legendary.png` | 56.568 | **55.24 KB** | **5** | `utils/ranks.js` (2), `utils/__tests__/ranks.test.js` (3) |
| 18 | `decor_whale.png` | `assets/decor_icon/decor_whale.png` | 56.440 | **55.12 KB** | **1** | `features/library/lexiconMapData.js` (1) |
| 19 | `decor_map_scroll.png` | `assets/decor_icon/decor_map_scroll.png` | 54.942 | **53.65 KB** | **1** | `features/library/lexiconMapData.js` (1) |
| 20 | `decor_ship_wheel.png` | `assets/decor_icon/decor_ship_wheel.png` | 53.985 | **52.72 KB** | **1** | `features/library/lexiconMapData.js` (1) |

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

| Truy vấn | Giai đoạn | Planning Time (ms) | Execution Time (ms) | Buffers (Shared Hit / Read) | Ghi chú kỹ thuật & Đánh giá thay đổi |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`LIST_DECKS`** | Trước V10 | **0,044 ms** | **0,037 ms** | Hit: 4 / Read: 0 | `Seq Scan` + `Sort (created_at DESC)` in-memory trên 20 bộ từ. |
| | Sau V10 | **0,037 ms** | **0,031 ms** | Hit: 4 / Read: 0 | **Loại bỏ hoàn toàn bước Sort**, dùng `Index Scan using idx_vocabulary_sets_user_created`. Với tập dữ liệu nhỏ trong buffer cache (4 buffers), thời gian thực thi tương đương nhau (~0,03 - 0,04 ms); lợi ích chính là bảo vệ DB không bị Sort in-memory khi số lượng bộ từ tăng cao. |
| **`DECK_STATS`** | Trước V10 | **0,358 ms** | **1,257 ms** | Hit: 153 / Read: 0 | Dùng `idx_study_plan_decks_plan_order` và `idx_vocabulary_set_items_deck_vocab`. |
| | Sau V10 | **0,397 ms** | **1,428 ms** | Hit: 153 / Read: 0 | **V10 không thay đổi index nào của query `DECK_STATS`** (vẫn sử dụng nguyên bản các index có sẵn từ V5 & V9). Buffers trước và sau bằng nhau tuyệt đối (**153 shared hits**). Mọi chênh lệch ms đều nằm hoàn toàn trong dải nhiễu hệ thống; V10 không tác động cải thiện query này. |
| **`PLAN_AGGREGATE`** | Trước V10 | **0,463 ms** | **6,589 ms** | Hit: 41.416 / Read: 0 | `HashAggregate` trên biểu thức chuỗi `LOWER(BTRIM(v.word, ...))`, kích thước tuple 40 bytes. |
| | Sau V10 & V11 | **0,429 ms** | **5,595 ms** | Hit: 41.416 / Read: 0 | **Buffers của `PLAN_AGGREGATE` trước và sau đều bằng 41.416 shared hits**. Chênh lệch thời gian thực thi ms nằm trong khoảng nhiễu tải máy, **V10 không cải thiện thời gian query này**. Lợi ích kỹ thuật thực sự của V10 & V11 là dùng cột sinh `v.word_norm` (chuẩn hóa Unicode NFC ở V11), giúp giảm kích thước tuple in-memory của HashAggregate (từ 40 bytes xuống 22 bytes), giảm áp lực working memory và đảm bảo tính nhất quán với Java `normalizeWord`. |

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


---

## 7. Kết Quả Tối Ưu Sau Giai Đoạn 3 (Batch Hóa Đường Ghi Nóng)

Giai đoạn 3 tập trung giải quyết triệt để hai điểm nghẽn ghi dữ liệu nghiêm trọng nhất của hệ thống:
1. **`PUT /api/decks/{id}`**: Thay thế Hibernate dirty checking N+1 lặp 500 thẻ bằng `JdbcTemplate.batchUpdate` có diff in-memory.
2. **`POST /api/study/sessions` + `POST /answers`**: Thay thế vòng lặp SM-2, XP check và insert đơn lẻ bằng Bulk SM-2 PostgreSQL UPSERT, batch insert answers và batch XP check/award $O(1)$.
3. **`createSession` Hard Gate Optimization**: Tối ưu hóa kiểm tra hard-gate của `createSession` bằng query nhẹ `hasCardsToStudyToday` (dùng `SELECT EXISTS (...) LIMIT 1`) thay vì load toàn bộ plan aggregate nặng nề.

### 7.1. Bảng Đối Chiếu Chỉ Số Baseline B1 vs Giai Đoạn 3 (Đo Thực Tế Trên Dataset B1)

*Tất cả số liệu đo trực tiếp qua `PerfBaselineRunnerIntegrationTest` trên database kiểm thử độc lập `language_learning_test` (port 5433).*

| STT | Endpoint / Kịch bản đo | Chỉ số | Baseline B1 (Trước P3) | Sau Giai đoạn 3 (Thực tế) | Tỷ lệ cải thiện | Đánh giá kiến trúc & Cơ chế tối ưu |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **1a** | **Ghi nhận 20 câu trả lời**<br>`POST /api/study/sessions`<br>+ `POST /answers` (20 câu)<br>*(Chưa chạm cap XP)* | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | **208 q**<br>1 (1 r)<br>75 r<br>**464 - 526 ms**<br>1.345 ms | **15 q**<br>3 (41 r)<br>64 r<br>**46 - 52 ms**<br>571 - 861 ms | **-92,8% queries**<br>Batch gom $O(1)$<br>-<br>**-90,1% thời gian**<br>-47,2% COLD | **Bulk SM-2 & Batch XP**: Gom 20 câu vào 1 query validate từ vựng `IN (...)`, 1 query check duplicate `IN (...)`, 1 JDBC batch insert `study_answers`, 1 query lock progress `FOR UPDATE`, 1 native bulk upsert `study_progress`, 4 queries batch XP, và 1 query update session. Số query giảm từ 208 xuống 15! |
| **1b** | **Ghi nhận 20 câu trả lời**<br>`POST /api/study/sessions`<br>+ `POST /answers` (20 câu)<br>*(Đã chạm cap XP)* | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | **188 q**<br>1 (1 r)<br>75 r<br>**303 ms**<br>401 ms | **14 q**<br>3 (41 r)<br>64 r<br>**56 - 71 ms**<br>71 - 98 ms | **-92,6% queries**<br>Batch gom $O(1)$<br>-<br>**-79,5% thời gian**<br>-75,6% COLD | Tương tự 1a, nhưng do user đã chạm Daily XP cap (500 XP), bỏ qua câu lệnh cập nhật `user_xp` nên giảm đúng 1 query (còn 14 queries). |
| **1c** | **Ghi nhận 100 câu trả lời**<br>`POST /api/study/sessions`<br>+ `POST /answers` (100 câu)<br>*(Chưa chạm cap XP)* | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | *(Không đo ở B1)* | **15 q**<br>3 (201 r)<br>304 r<br>**80 - 115 ms**<br>97 - 135 ms | **Độ phức tạp $O(1)$**<br>(100 câu vẫn tốn 15 queries) | **Chứng minh $O(1)$ query complexity**: Dù kích thước batch tăng gấp 5 lần (từ 20 lên 100 câu), số query giữ nguyên tuyệt đối 15 queries. Batching gom đúng 201 dòng (100 answers + 100 progress + 1 xp event). |
| **1d** | **Ghi nhận 100 câu trả lời**<br>`POST /api/study/sessions`<br>+ `POST /answers` (100 câu)<br>*(Đã chạm cap XP)* | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | *(Không đo ở B1)* | **14 q**<br>3 (201 r)<br>304 r<br>**67 - 81 ms**<br>69 - 141 ms | **Độ phức tạp $O(1)$**<br>(100 câu vẫn tốn 14 queries) | Số query giữ nguyên 14 queries khi tăng lên 100 câu. Thời gian thực thi chỉ 67 - 81 ms. |
| **1e** | **Khởi tạo session độc lập**<br>`POST /api/study/sessions`<br>*(Không plan / Không bật hard gate)* | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | *(Không tách ở B1)* | **4 q**<br>0 (0 r)<br>2 r<br>**12 - 14 ms**<br>12 - 16 ms | **Đo thật từ harness** | Gồm 1 query kiểm tra plan hard gate, 1 query kiểm tra deck ownership, 1 query count items, 1 query insert session. |
| **1f** | **Khởi tạo session độc lập**<br>`POST /api/study/sessions`<br>*(Bật hard gate, còn thẻ cần học)* | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | *(Không tách ở B1)* | **2 q**<br>0 (0 r)<br>2 r<br>**16 - 42 ms**<br>43 - 69 ms | **Chặn sớm $O(1)$**<br>(Status 400 Bad Request) | Gồm 1 query nạp plan có hard gate, 1 query `hasCardsToStudyToday` (dùng `SELECT EXISTS (...) LIMIT 1` dừng ngay ở thẻ đầu tiên). Ném `HARD_GATE_ACTIVE`. |
| **1g** | **Đo riêng `recordAnswers` (20 câu)**<br>`POST /sessions/{id}/answers`<br>*(Chưa chạm cap XP)* | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | *(Không tách ở B1)* | **11 q**<br>3 (41 r)<br>62 r<br>**20 - 32 ms**<br>18 - 20 ms | **ĐẠT MỤC TIÊU**<br>($\le 12$ queries) | **Tách số query chuẩn xác**: Bản thân nghiệp vụ ghi nhận câu trả lời chỉ tiêu tốn đúng **11 queries**, hoàn thành cam kết $\le 12$ queries. |
| **1h** | **Đo riêng `recordAnswers` (20 câu)**<br>`POST /sessions/{id}/answers`<br>*(Đã chạm cap XP)* | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | *(Không tách ở B1)* | **10 q**<br>3 (41 r)<br>62 r<br>**16 - 32 ms**<br>13 - 36 ms | **ĐẠT MỤC TIÊU**<br>($\le 12$ queries) | Đã chạm cap XP: bỏ qua query cập nhật `user_xp`, chỉ tiêu tốn **10 queries**. |
| **1i** | **Đo riêng `recordAnswers` (100 câu)**<br>`POST /sessions/{id}/answers`<br>*(Chưa chạm cap XP)* | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | *(Không tách ở B1)* | **11 q**<br>3 (201 r)<br>302 r<br>**44 - 67 ms**<br>49 - 81 ms | **ĐẠT MỤC TIÊU**<br>($\le 12$ queries) | Tăng kích thước 5x (100 câu) vẫn giữ đúng **11 queries**, thời gian 44 - 67 ms. |
| **1j** | **Đo riêng `recordAnswers` (100 câu)**<br>`POST /sessions/{id}/answers`<br>*(Đã chạm cap XP)* | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | *(Không tách ở B1)* | **10 q**<br>3 (201 r)<br>302 r<br>**57 - 77 ms**<br>55 - 81 ms | **ĐẠT MỤC TIÊU**<br>($\le 12$ queries) | Tăng 100 câu vẫn giữ đúng **10 queries**. |
| **2** | **PUT Deck (a: Sửa 500 thẻ có sẵn)**<br>`PUT /api/decks/{id}` | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | **2.501 q**<br>999 (1.000 r)<br>1.501 r<br>**1.958 - 2.271 ms**<br>2.839 ms | **7 q**<br>2 (1.000 r)<br>1.501 r<br>**127 - 196 ms**<br>208 - 273 ms | **-99,7% queries**<br>Batch gom thực sự<br>-<br>**-93,5% thời gian**<br>-90,5% COLD | **Bulk JDBC Update**: Thay dirty-checking N+1 bằng `jdbcTemplate.batchUpdate`. 1.000 dòng được cập nhật trọn vẹn trong đúng 2 batch JDBC (`b:2(1000)`). Số query giảm ngoạn mục từ 2.501 xuống 7. |
| **2'** | **PUT Deck (a': Sửa 500 thẻ không đổi)**<br>`PUT /api/decks/{id}` | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | *(Không tách ở B1)* | **4 q**<br>0 (0 r)<br>1.501 r<br>**29 - 101 ms**<br>27 - 42 ms | **-100% write queries**<br>(0 batch, 0 updates) | **Diff In-Memory**: So khớp toàn bộ thuộc tính thẻ và synonyms trong RAM trước khi gửi SQL. Nếu người dùng lưu bộ thẻ mà không sửa nội dung thẻ, 0 câu UPDATE/DELETE nào được phát sinh tới DB. |
| **3** | **PUT Deck (b: Thêm 500 thẻ mới)**<br>`PUT /api/decks/{id}` | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)** | **5 q**<br>0 (0 r)<br>501 r<br>**106 - 111 ms** | **5 q**<br>0 (0 r)<br>501 r<br>**73 - 83 ms** | **0% suy thoái**<br>(Duy trì tối ưu có sẵn) | Giữ nguyên đường dẫn bulk insert đa dòng `createCardsForDeckBatch`. |
| **4** | **PUT Deck (c: Xóa 500 thẻ)**<br>`PUT /api/decks/{id}` | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)** | **9 q**<br>2 (2 r)<br>504 r<br>**44 - 71 ms** | **9 q**<br>2 (2 r)<br>504 r<br>**33 - 51 ms** | **0% suy thoái**<br>(Duy trì tối ưu có sẵn) | Giữ nguyên 9 queries warm, 504 dòng đọc. |

### 7.2. Phân Tích Kỹ Thuật Câu Lệnh SQL Trích Từ Code Thực Tế

#### Đánh giá mục tiêu $\le 12$ queries:
- **Khi đo riêng lẻ `recordAnswers`**: Số query thực tế là **10 queries** (khi đã chạm trần XP) và **11 queries** (khi chưa chạm trần XP). **MỤC TIÊU $\le 12$ QUERIES ĐÃ HOÀN TOÀN ĐẠT ĐƯỢC**.
- **Khi đo chuỗi kết hợp `createSession + recordAnswers`**: Tốn **14 - 15 queries** vì chuỗi bao gồm thêm 4 câu lệnh khởi tạo phiên học (`createSession`).

#### Giải thích chỉ số batch rows nhất quán:
- Với batch **20 câu**: Gồm 3 batch calls:
  1. `study_answers`: batch 20 rows
  2. `study_progress`: batch 20 rows
  3. `xp_events`: batch 1 row
  $\rightarrow$ Tổng cộng: **3 batches (41 rows)**.
- Với batch **100 câu**: Gồm 3 batch calls:
  1. `study_answers`: batch 100 rows
  2. `study_progress`: batch 100 rows
  3. `xp_events`: batch 1 row
  $\rightarrow$ Tổng cộng: **3 batches (201 rows)**.
Số lần gọi `executeBatch` giữ nguyên là $O(1) = 3$ batches.

#### Danh sách câu lệnh SQL trích xuất từ source code:

##### Nhóm I: Khởi tạo phiên học `createSession` (4 queries khi không hard gate)
1. `StudyPlanRepository.findByUserIdAndStatusAndHardGateEnabledTrue`:
   ```sql
   SELECT id, hard_gate_enabled, status FROM study_plans 
   WHERE user_id = ? AND status = 'ACTIVE' AND hard_gate_enabled = true;
   ```
2. `VocabularySetRepository.findByIdAndUserId`:
   ```sql
   SELECT id, name, user_id FROM vocabulary_sets WHERE id = ? AND user_id = ?;
   ```
3. `VocabularySetItemRepository.countByVocabularySetId`:
   ```sql
   SELECT count(*) FROM vocabulary_set_items WHERE vocabulary_set_id = ?;
   ```
4. `StudySessionRepository.save`:
   ```sql
   INSERT INTO study_sessions (user_id, vocabulary_set_id, mode, question_count, shuffle_mode, started_at) 
   VALUES (?, ?, ?, ?, ?, ?);
   ```

##### Nhóm II: Ghi nhận câu trả lời `recordAnswersBatch` (10 - 11 queries)
5. **Session Lock**:
   ```sql
   SELECT * FROM study_sessions WHERE id = ? AND user_id = ? FOR NO KEY UPDATE;
   ```
6. **Deck Vocabulary Validation**:
   ```sql
   SELECT vocabulary_id FROM vocabulary_set_items 
   WHERE vocabulary_set_id = ? AND vocabulary_id IN (?, ?, ...);
   ```
7. **Duplicate Client Answer Detection**:
   ```sql
   SELECT client_answer_id, override, is_correct FROM study_answers 
   WHERE session_id = ? AND client_answer_id IN (?, ?, ...);
   ```
8. **Batch Insert Answers With Conflict Avoidance**:
   ```sql
   INSERT INTO study_answers (session_id, vocabulary_id, question_type, user_answer, is_correct, client_answer_id, override, attempt_no, answered_at) 
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?), ... 
   ON CONFLICT (session_id, client_answer_id) WHERE client_answer_id IS NOT NULL DO NOTHING 
   RETURNING client_answer_id;
   ```
9. **Progress Row Lock (Deadlock-Free by Ascending vocabulary_id)**:
   ```sql
   SELECT * FROM study_progress WHERE user_id = ? AND vocabulary_id IN (?, ?, ...) 
   ORDER BY vocabulary_id FOR UPDATE;
   ```
10. **Bulk UPSERT Study Progress & SM-2**:
    ```sql
    INSERT INTO study_progress (user_id, vocabulary_id, correct_count, wrong_count, accuracy, current_streak, difficulty, memory_level, last_reviewed_at, next_review_at, interval_days, ease_factor, repetitions, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, 0.00, ?, ?, ?, ?, ?, ?, ?, ?) 
    ON CONFLICT (user_id, vocabulary_id) DO UPDATE SET 
      correct_count = EXCLUDED.correct_count, 
      wrong_count = EXCLUDED.wrong_count, 
      accuracy = EXCLUDED.accuracy, 
      current_streak = EXCLUDED.current_streak, 
      memory_level = EXCLUDED.memory_level, 
      last_reviewed_at = EXCLUDED.last_reviewed_at, 
      next_review_at = EXCLUDED.next_review_at, 
      interval_days = EXCLUDED.interval_days, 
      ease_factor = EXCLUDED.ease_factor, 
      repetitions = EXCLUDED.repetitions, 
      updated_at = EXCLUDED.updated_at;
    ```
11. **Daily XP Quota Check**:
    ```sql
    SELECT coalesce(sum(xp), 0) FROM xp_events 
    WHERE user_id = ? AND created_at >= ? AND created_at < ?;
    ```
12. **Idempotent XP Event Keys Check**:
    ```sql
    SELECT source_key FROM xp_events 
    WHERE user_id = ? AND source_type = 'STUDY_ANSWER' AND source_key IN (?, ?, ...);
    ```
13. **Batch Insert XP Events**:
    ```sql
    INSERT INTO xp_events (user_id, source_type, source_key, xp, created_at) 
    VALUES (?, ?, ?, ?, ?) ON CONFLICT (user_id, source_type, source_key) DO NOTHING;
    ```
14. **Atomic User XP Increment** *(Chỉ thực thi khi chưa chạm cap XP)*:
    ```sql
    INSERT INTO user_xp (user_id, total_xp, updated_at) VALUES (?, ?, ?) 
    ON CONFLICT (user_id) DO UPDATE SET total_xp = user_xp.total_xp + ?;
    ```
15. **Save Session Counts**:
    ```sql
    UPDATE study_sessions 
    SET total_questions = ?, correct_answers = ?, wrong_answers = ? WHERE id = ?;
    ```

#### Ghi chú về Daily XP Cap và Concurrency:
- Giới hạn trần XP trong ngày (500 XP) được tính toán dựa trên tổng điểm thực nhận trong `xp_events` từ đầu ngày theo múi giờ.
- Khi người dùng gửi nhiều batch đồng thời, chỉ mục unique `(user_id, source_type, source_key)` trên `xp_events` đảm bảo mỗi câu trả lời chỉ được nhận XP đúng 1 lần duy nhất.
- Khi tổng XP trong ngày đạt trần, câu lệnh 14 (`user_xp.addXpAtomic`) được bỏ qua hoàn toàn, tự động giảm số query từ 11 xuống 10 (hoặc từ 15 xuống 14 trong chuỗi kết hợp).

---

## 8. Kết Quả Tối Ưu Sau Giai Đoạn 4 (Tối Ưu Đường Đọc & Bảo Mật)

Giai đoạn 4 tập trung giải quyết triệt để các vấn đề hiệu năng đường đọc (read paths) và bảo mật quyền sở hữu tài nguyên (IDOR prevention):
1. **Endpoint tóm tắt siêu nhẹ `GET /api/study-plans/current/today/summary`**: Thiết kế endpoint đếm số lượng thẻ (`totalWords`, `dueWords`, `weakWords`, `newWords`) chỉ tốn 338 bytes (gzip 258 B) thay vì 547 kB, chuyển đổi toàn bộ frontend consumers (`DailyGateReminder`, `AppDock`, `SpacedRepetitionCard`, `StudyPlanPage`) sang dùng summary endpoint khi chỉ cần số đếm.
2. **Analytics SQL Aggregation**: Thay thế hoàn toàn việc nạp hàng chục nghìn entity vào RAM ở 4 endpoint analytics bằng các câu truy vấn SQL aggregate, `FILTER (WHERE ...)`, và partial index scan (`idx_study_progress_user_weak`).
3. **Kiểm tra bảo mật quyền sở hữu (IDOR Prevention)**: Vá toàn diện các truy vấn nạp dữ liệu bằng `findByIdAndUserId` và bổ sung kiểm tra `userId` trên toàn bộ các service liên quan, đảm bảo không tiết lộ hoặc cho phép can thiệp dữ liệu chéo giữa các người dùng.
4. **Phân tích thực nghiệm `TODAY_QUEUE_CARDS` (CTE Window Query) vs Fallback**: Đo lường chi tiết và đưa ra quyết định kiến trúc dựa trên số đo thực tế.

### 8.1. Bảng Đối Chiếu Chỉ Số Giai Đoạn 4 (Đo Cùng Một Lần Chạy Trên Dataset B1)

*Số liệu đo trực tiếp qua `PerfBaselineRunnerIntegrationTest` trên database kiểm thử độc lập `language_learning_test` (port 5433), so sánh song song giữa bản LEGACY (`LegacyAnalyticsTestHelper`) và bản MỚI (SQL trực tiếp) trong cùng một lần chạy trên dataset B1 (5.501 vocabularies, 23 decks, 10.000 items, 2.000 sessions, 10.000 progress).*

| STT | Endpoint | Bản triển khai | Số query | Dòng DB đọc | Payload Bytes (Raw / Gzip) | Thời gian COLD | Thời gian WARM | Đánh giá kiến trúc & Cơ chế tối ưu |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | **Hàng đợi học hôm nay**<br>`GET /api/study-plans/current/today`<br>*(1.750 thẻ: 1.250 due + 500 weak)* | **Production**<br>(In-Memory + Batch Prefetch) | **5 q** | **6.761 r** | 541.621 B<br>(gzip: 31.878 B) | 631 ms | **274 ms** | Đã loại bỏ hoàn toàn tham số `?cte` và CTE `TODAY_QUEUE_CARDS` khỏi production code. Bản in-memory tận dụng 5 câu truy vấn indexed đơn giản, nạp từ vựng và batch prefetch synonyms, sort trên JVM RAM (<2 ms cho 2.500 từ). Thời gian service thực tế ~111 - 127 ms. |
| **2** | **Tóm tắt hàng đợi học**<br>`GET /api/study-plans/current/today/summary`<br>*(Endpoint mới Giai đoạn 4)* | **MỚI**<br>(SQL Aggregate Summary) | **2 q** | **2 r** | **336 B**<br>(gzip: 257 B) | **73 ms** | **43 ms** | **-60% queries, -99,97% dòng đọc, -99,94% bytes, nhanh hơn 6x!** Endpoint trả về `{planId, planName, todayDate, dueWords, weakWords, newWords, totalWords}`. Phục vụ toàn bộ dock badge, reminder modal, dashboard card thay vì phải kéo full payload 541 kB. |
| **3** | **Analytics Overview**<br>`GET /api/analytics/overview` | **LEGACY**<br>**(MỚI SQL)** | 2 q<br>**2 q** | 7.000 r<br>**61 r** | 301 B (gz: 238 B)<br>**301 B (gz: 237 B)** | 125 ms<br>**19 ms** | 106 ms<br>**8 ms** | **-99,1% dòng đọc, -92,5% thời gian warm!** Dùng scalar subqueries gộp `SUM(total_questions)`, `SUM(correct_answers)`, `SUM(wrong_answers)`, `COUNT(learned)` và `DISTINCT date` tính streak. |
| **4** | **Analytics Weak Words**<br>`GET /weak-words?limit=10` | **LEGACY**<br>**(MỚI SQL)** | 2 q<br>**1 q** | 5.010 r<br>**10 r** | 2.157 B (gz: 371 B)<br>**2.157 B (gz: 371 B)** | 109 ms<br>**15 ms** | 91 ms<br>**7 ms** | **-50% queries, -99,8% dòng đọc, -92,3% thời gian warm!** Tận dụng partial index scan `idx_study_progress_user_weak` kết hợp `JOIN vocabularies` và `LIMIT 10`. |
| **5** | **Analytics Retention**<br>`GET /api/analytics/retention` | **LEGACY**<br>**(MỚI SQL)** | 3 q<br>**1 q** | 5.024 r<br>**1 r** | 219 B (gz: 200 B)<br>**219 B (gz: 200 B)** | 134 ms<br>**16 ms** | 85 ms<br>**13 ms** | **-66,7% queries, -99,98% dòng đọc, -84,7% thời gian warm!** Query duy nhất dùng `COUNT(*) FILTER (WHERE ...)` tổng hợp trực tiếp trong PostgreSQL trả về đúng 1 dòng. |
| **6** | **Analytics Heatmap**<br>`GET /api/analytics/heatmap` | **LEGACY**<br>**(MỚI SQL)** | 1 q<br>**1 q** | 2.000 r<br>**60 r** | 6.930 B (gz: 474 B)<br>**6.930 B (gz: 476 B)** | 49 ms<br>**17 ms** | 29 ms<br>**4 ms** | **-97,0% dòng đọc, -86,2% thời gian warm!** Gom nhóm theo `(started_at AT TIME ZONE ?)::date` trực tiếp trong database, trả về đúng 60 ngày có học thay vì quét 2.000 sessions. |
| **7** | **Analytics Suite**<br>*(Tổng hợp cả 4 endpoint)* | **LEGACY**<br>**(MỚI SQL)** | 8 q<br>**5 q** | 19.034 r<br>**132 r** | 9.607 B (gz: 1.283 B)<br>**9.559 B (gz: 1.277 B)** | 328 ms<br>**24 ms** | 291 ms<br>**20 ms** | **-37,5% queries, -99,31% dòng đọc, -93,1% thời gian warm!** Triệt tiêu hoàn toàn áp lực cấp phát RAM và GC pauses trên môi trường Render 512MB RAM. |

#### Giải thích hiện tượng lệch 1.750 bytes payload và quy chuẩn đo:
- Ở các bản benchmark trước, payload `/today` có lúc đo được 545.900 B (B1) và 547.650 B (B2) (lệch đúng 1.750 B).
- **Nguyên nhân**: Lệnh `TRUNCATE TABLE ... CASCADE` trong harness trước đây thiếu mệnh đề `RESTART IDENTITY`. Khi seed lại nhiều lần, sequence khóa chính của bảng `vocabularies` vượt mốc 9.999 lên 10.000+ (từ 4 chữ số tăng lên 5 chữ số). Do hàng đợi `/today` có đúng 1.750 thẻ, mỗi ID thẻ tăng thêm 1 chữ số ASCII (1 byte) trong chuỗi JSON, dẫn đến đúng $1.750 × 1\text{ byte} = 1.750\text{ bytes}$ chênh lệch.
- **Biện pháp xử lý**: Đã bổ sung `RESTART IDENTITY` vào lệnh TRUNCATE trong harness (`TRUNCATE TABLE ... RESTART IDENTITY CASCADE`), giúp sequence ID luôn được reset về 1 cố định.
- **Ghi chú quan trọng**: Payload `/today` của B1 (545.900 B) và B2 (547.650 B) không so sánh trực tiếp với số hiện tại (541.621 B) vì id đã đổi do `RESTART IDENTITY`; tuy nhiên số query (5 q) và số dòng đọc (6.761 r) hoàn toàn bất biến và so sánh trực tiếp được.

### 8.2. Kế Hoạch Đo EXPLAIN (ANALYZE, BUFFERS) Trên PostgreSQL 18.4 (Dataset B1)

Thực thi độc lập trên database `language_learning_test` (port 5433) cho các câu truy vấn đọc:

```sql
-- 1. TODAY_QUEUE_CARDS (Thực nghiệm CTE Window function)
-- Execution Time: 29.597 ms | Planning Time: 45.429 ms | Buffers: shared hit=6147
-- Node chính: WindowAgg (ROW_NUMBER() OVER (...)), HashAggregate, Nested Loop JOIN.
-- Kết luận: Phức tạp hóa câu lệnh SQL không mang lại lợi ích thực tế so với bản in-memory indexed.

-- 2. TODAY_QUEUE_SUMMARY (Summary count)
-- Execution Time: 10 - 21 ms | Planning Time: ~1 ms (warm catalog cache) | Buffers: shared hit=384
-- Node chính: Aggregate COUNT(*) FILTER (...). Buffers chỉ 384 hits (giảm 93,8% so với full cards).

-- 3. OVERVIEW_TOTALS (Analytics Overview)
-- Execution Time: 7.723 ms | Buffers: shared hit=167
-- Node chính: Scalar Subquery Aggregates trên study_sessions và study_progress.

-- 4. HEATMAP_DAILY (Analytics Heatmap)
-- Execution Time: 5.965 ms | Buffers: shared hit=28
-- Node chính: HashAggregate GROUP BY day.

-- 5. RETENTION_DISTRIBUTION (Analytics Retention)
-- Execution Time: 7.927 ms | Buffers: shared hit=256
-- Node chính: Aggregate COUNT(*) FILTER (...) trả về đúng 1 dòng.

-- 6. WEAK_WORDS (Analytics Weak Words)
-- Execution Time: 2.980 ms | Buffers: shared hit=1104
-- Xác nhận Index được sử dụng: Index Scan using idx_study_progress_user_weak on study_progress!
-- Không sort full table, dừng ngay khi đủ LIMIT 10.
```

### 8.3. Kết Quả Điều Tra Chuyên Sâu Về Hiệu Năng (Sub-step Investigations)

#### 1. Điều tra chi tiết hiệu năng giữa bản CTE và bản In-Memory (Statement-by-Statement & Service-Level Profile):
- Tiến hành đo statement-by-statement chi tiết qua DataSource Proxy và Stopwatch nội bộ qua 10 lần chạy trên dataset B1:
  - **Query 1 (CTE SQL `TODAY_QUEUE_CARDS`)**: Cold 117 ms, Warm 27 - 60 ms.
  - **ResultSet Mapping (1.750 rows)**: Chỉ tốn **1 - 8 ms**! $\rightarrow$ **Bác bỏ hoàn toàn giả thuyết "do JDBC row mapping / buffer hits tốn hàng trăm ms"**.
  - **Query 2 (Synonyms ANY(?))**: Cold 76 ms, Warm 4 - 10 ms.
  - **Synonym Mapping**: 0 - 2 ms.
  - **Tổng thời gian tầng Service (cô lập)**:
    - Bản CTE warm: **33 - 74 ms**
    - Bản In-Memory warm: **111 - 133 ms** (cold 631 - 857 ms)
- **Kết luận kiến trúc**:
  - Trong phép đo cô lập tầng service, bản CTE warm (33 - 74 ms) nhanh hơn in-memory (111 - 133 ms).
  - Bản in-memory được giữ lại cho production vì: đơn giản, ít rủi ro, không phụ thuộc vào window function phức tạp của DB engine, đã có bộ test suite hành vi bao phủ đầy đủ, và vì `/today` chỉ dùng riêng ở màn hình học trực tiếp (tất cả các nơi gọi thường xuyên như dock badge, reminder modal, dashboard card đã chuyển sang endpoint siêu nhẹ `/today/summary` với thời gian warm 43 ms và 2 queries).
  - Nguyên nhân của con số warm 956 ms / 1.720 ms đo trước đó qua harness MockMvc chưa xác định (có thể do serialization overhead của MockMvc hoặc môi trường test runner).
  - Bản triển khai CTE đầy đủ được lưu trữ và bảo toàn trong git commit `ebec000` để tham khảo khi cần chuyển đổi trong tương lai.

#### 2. Điều tra Planning Time 43-45 ms của `TODAY_QUEUE_SUMMARY` (JIT ON vs JIT OFF):
- Chạy thực nghiệm `EXPLAIN (ANALYZE, BUFFERS)` với `SET jit = on` vs `SET jit = off`:
  - **JIT ON**: Planning time 0.8 - 1.8 ms, Execution time 11 - 16 ms.
  - **JIT OFF**: Planning time 0.9 - 1.3 ms, Execution time 10 - 15 ms.
- **Kết luận**: JIT không phải là nguyên nhân gây planning time cao. Con số 43-45 ms planning time ghi nhận ban đầu xuất phát từ hiện tượng **PostgreSQL catalog cache miss (cold catalog cache)** khi connection mới được khởi tạo và database phải tra cứu metadata của 6 bảng/views liên quan. Khi catalog cache đã warm, planning time của truy vấn chỉ tốn xấp xỉ **1 ms**.

### 8.4. Ma Trận Bảo Mật Quyền Sở Hữu Resource (IDOR Security Matrix - Chạy Thật 30 Scenarios)

*Kiểm thử tự động 100% bằng integration test HTTP thực tế `IdorSecurityMatrixIntegrationTest` (30 test methods, 0 failures) trên PostgreSQL test (port 5433). Mọi đường dẫn endpoint được trích xuất trực tiếp từ các Annotation `@RequestMapping`, `@GetMapping`, `@PostMapping`, `@PutMapping`, `@PatchMapping`, `@DeleteMapping` của Controllers thật trong `src/main`.*

#### 1. Nhóm IDOR Thực Sự (Truy Cập Chéo Resource Giữa Các User - 27 Scenarios)
*User A gửi request thao tác bằng ID tài nguyên của User B. Hệ thống bắt buộc phải từ chối và trả về HTTP 404 NOT FOUND (không tiết lộ sự tồn tại của resource).*

| STT | Phương thức | Endpoint thực tế | Resource | Hành vi tấn công của User A | Mã HTTP | Trạng thái dữ liệu của User B | Đánh giá |
| :---: | :---: | :--- | :--- | :--- | :---: | :--- | :---: |
| 1 | `GET` | `/api/decks/{id}` | `VocabularySet` | Đọc deck của B bằng `deckId_B` | **404** | Không lộ dữ liệu từ vựng của B | **AN TOÀN** |
| 2 | `PUT` | `/api/decks/{id}` | `VocabularySet` | Sửa thông tin deck của B | **404** | Tên và mô tả của B không đổi | **AN TOÀN** |
| 3 | `DELETE` | `/api/decks/{id}` | `VocabularySet` | Xóa deck của B bằng `deckId_B` | **404** | Deck của B vẫn tồn tại nguyên vẹn | **AN TOÀN** |
| 4 | `GET` | `/api/folders/{id}` | `Folder` | Đọc thư mục của B | **404** | Không xem được thư mục của B | **AN TOÀN** |
| 5 | `PUT` | `/api/folders/{id}` | `Folder` | Đổi tên thư mục của B | **404** | Tên thư mục của B không bị thay đổi | **AN TOÀN** |
| 6 | `DELETE` | `/api/folders/{id}` | `Folder` | Xóa thư mục của B | **404** | Thư mục của B vẫn còn nguyên | **AN TOÀN** |
| 7 | `PATCH` | `/api/decks/{id}/folder` | `Folder` | Di chuyển deck A vào folder của B | **404** | Deck của A không thay đổi thư mục | **AN TOÀN** |
| 8 | `POST` | `/api/study/sessions` | `VocabularySet` | Bắt đầu học với `deckId` của B | **404** | Không tạo được session từ deck của B | **AN TOÀN** |
| 9 | `POST` | `/api/study/sessions/{id}/answers` | `StudySession` | Gửi câu trả lời vào session của B | **404** | Session của B không nhận câu trả lời trái phép | **AN TOÀN** |
| 10 | `POST` | `/api/study/sessions/{id}/finish` | `StudySession` | Kết thúc phiên học của B | **404** | Phiên học của B không bị kết thúc sớm | **AN TOÀN** |
| 11 | `POST` | `/api/study-plans` | `VocabularySet` | Tạo lộ trình học kèm deck của B | **404** | Không thể tạo study plan chứa deck của B | **AN TOÀN** |
| 12 | `POST` | `/api/study-plans/preview` | `VocabularySet` | Preview số từ của lộ trình với deck của B | **404** | Không làm lộ số lượng từ vựng của B | **AN TOÀN** |
| 13 | `POST` | `/api/study-plans/current/decks` | `VocabularySet` | Thêm deck của B vào lộ trình của A | **404** | Lộ trình của A không thêm được deck của B | **AN TOÀN** |
| 14 | `DELETE` | `/api/study-plans/current/decks/{deckId}` | `VocabularySet` | Xóa deck của B khỏi plan | **404** | Deck của B vẫn nguyên vẹn trong lộ trình của B | **AN TOÀN** |
| 15 | `GET` | `/api/decks/{id}/srs-forecast` | `VocabularySet` | Xem dự báo SRS của deck thuộc B | **404** | Không xem được forecast của B | **AN TOÀN** |
| 16 | `GET` | `/api/decks/{id}/srs-queue` | `VocabularySet` | Xem queue SRS của deck thuộc B | **404** | Không xem được queue của B | **AN TOÀN** |
| 17 | `GET` | `/api/decks/{deckId}/synonym-challenges` | `VocabularySet` | Đọc hàng đợi từ đồng nghĩa deck của B | **404** | Không xem được dữ liệu synonym của B | **AN TOÀN** |
| 18 | `GET` | `/api/decks/{deckId}/synonym-challenges/stats` | `VocabularySet` | Xem thống kê đồng nghĩa của deck thuộc B | **404** | Không xem được thống kê của B | **AN TOÀN** |
| 19 | `POST` | `/api/decks/{deckId}/synonym-challenges/quick-add` | `VocabularySet` | Thêm nhanh từ vào deck của B | **404** | Deck của B không bị thêm từ trái phép | **AN TOÀN** |
| 20 | `POST` | `/api/decks/{deckId}/synonym-challenges/evaluate` | `VocabularySet` | Đánh giá synonym trên deck của B | **404** | Không chấm điểm synonym trên deck của B | **AN TOÀN** |
| 21 | `POST` | `/api/decks/{deckId}/synonym-challenges/evaluate` | `Vocabulary` | Đánh giá synonym với vocabId của B | **404** | Bị từ chối vì từ vựng không nằm trong deck A | **AN TOÀN** |
| 22 | `GET` | `/api/decks/{deckId}/sentence-challenges` | `VocabularySet` | Lấy thử thách đặt câu từ deck của B | **404** | Không đọc được câu hỏi bài tập của B | **AN TOÀN** |
| 23 | `POST` | `/api/decks/{deckId}/sentence-challenges/evaluate` | `VocabularySet` | Chấm điểm câu trên deck của B | **404** | Không chấm điểm trên deck của B | **AN TOÀN** |
| 24 | `POST` | `/api/decks/{deckId}/context-story` | `VocabularySet` | Sinh truyện ngữ cảnh từ deck của B | **404** | Không dùng AI sinh truyện trên deck của B | **AN TOÀN** |
| 25 | `GET` | `/api/decks/{deckId}/context-story` | `VocabularySet` | Đọc truyện ngữ cảnh từ deck của B | **404** | Không đọc được truyện ngữ cảnh của B | **AN TOÀN** |
| 26 | `PATCH` | `/api/wallpapers/{id}/active` | `UserWallpaper` | Kích hoạt hình nền của B | **404** | Không kích hoạt được hình nền của B | **AN TOÀN** |
| 27 | `DELETE` | `/api/wallpapers/{id}` | `UserWallpaper` | Xóa hình nền của B | **404** | Hình nền của B vẫn còn nguyên | **AN TOÀN** |

#### 2. Nhóm Kiểm Tra Tính Toàn Vẹn & Cách Ly Dữ Liệu (Isolation & Integrity Checks - 3 Scenarios)
*User A thao tác trên tài nguyên của chính mình nhưng có truyền tham số hoặc thực hiện thao tác nhạy cảm: đảm bảo hoàn toàn không làm sai lệch hay tác động đến tài nguyên của User B.*

| STT | Phương thức | Endpoint thực tế | Resource | Hành vi kiểm tra | Mã HTTP | Trạng thái dữ liệu của User B | Đánh giá |
| :---: | :---: | :--- | :--- | :--- | :---: | :--- | :---: |
| 28 | `PUT` | `/api/decks/{id}` | `Vocabulary` | User A sửa deck của A nhưng chèn ID thẻ từ của B | **200** | **Bảo vệ thẻ B**: Server tự clone/tách tạo thẻ mới cho A; thẻ của B giữ nguyên | **AN TOÀN** |
| 29 | `PATCH` | `/api/study-plans/current` | `StudyPlan` | User A cập nhật cài đặt lộ trình của chính mình | **200** | Lộ trình của User B giữ nguyên tên, ngày và settings | **AN TOÀN** |
| 30 | `DELETE` | `/api/study-plans/current` | `StudyPlan` | User A xóa lộ trình đang hoạt động của mình | **200** | Chỉ xóa plan của A; Lộ trình của B vẫn ACTIVE | **AN TOÀN** |

### 8.5. Tổng Kết Số Lượng Kiểm Thử Sau Giai Đoạn 4 (213 Backend / 247 Frontend)

- **Backend (JUnit 5 + Spring Boot Test)**: **213 tests passed** (0 failures, 0 errors, 0 skipped).
- **Frontend (Vitest + React Testing Library)**: **247 tests passed** (0 failures across 29 test suites).
- **Phân tích chuyển đổi số test (217 $\rightarrow$ 213 tests)**:
  - Ở mốc 4.7, backend có 217 tests do lớp `IdorSecurityMatrixIntegrationTest` chứa 34 test methods.
  - Sang nhiệm vụ 4.8, hệ thống thực hiện rà soát nghiêm ngặt toàn bộ route controller so với nhánh `main`. 4 route nhân tạo được thêm tạm ở giai đoạn trước (`/current/settings`, `DELETE /{id}`, `/forecast/{deckId}`, `/decks/{deckId}/queue` trên `StudyPlanController`) đã được xóa bỏ hoàn toàn khỏi production code.
  - Tương ứng, 4 test methods gọi trực tiếp vào 4 route nhân tạo này đã được dọn dẹp, và đều có test tương đương chuẩn hóa phủ lại 100% trên các route chính thức:
    1. `testUpdatePlanSettingsOfCurrentUserDoesNotAffectOtherUser` $\rightarrow$ Đã được phủ bởi `testUpdatePlanPatchCurrentDoesNotAffectOtherUser` (`PATCH /api/study-plans/current`).
    2. `testDeletePlanByIdOfOtherUser_Returns404` $\rightarrow$ Đã được phủ bởi `testDeleteActivePlanDoesNotDeletePlanOfOtherUser` (`DELETE /api/study-plans/current`).
    3. `testGetDeckForecastFromStudyPlansEndpointOfOtherUser_Returns404` $\rightarrow$ Đã được phủ bởi `testGetDeckForecastOfOtherUser_Returns404` (`GET /api/decks/{id}/srs-forecast`).
    4. `testGetDeckStudyQueueFromStudyPlansEndpointOfOtherUser_Returns404` $\rightarrow$ Đã được phủ bởi `testGetDeckStudyQueueOfOtherUser_Returns404` (`GET /api/decks/{id}/srs-queue`).
  - Toàn bộ hành vi bảo mật và tính toàn vẹn dữ liệu được bảo toàn nguyên vẹn 100% qua 30 test methods trong `IdorSecurityMatrixIntegrationTest`.

