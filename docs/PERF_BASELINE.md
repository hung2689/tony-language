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

### 1.1. Bảng Đối Chiếu Chỉ Số Backend: Trước (Baseline 0.5 Gốc) vs Sau (Phase 1 & 2)

*Ghi chú nguồn số liệu*:
- **Cột Trước (Baseline 0.5 Gốc)**: 100% khôi phục nguyên bản từ kết quả đo chuẩn hóa tại commit `e2b4ee6ab2008ef097e0446a7e38f6a4f23a5690`. Lưu ý: Tập dữ liệu của Baseline 0.5 cũ chạy tích lũy không truncate sạch giữa các test, khiến user chạm trần Daily XP (dẫn đến 188 queries thay vì 208 queries) và chưa tính COUNT query phân trang của Spring Data JPA.
- **Cột Sau (Phase 1 & 2)**: Đo thực tế qua `PerfBaselineRunnerIntegrationTest` trên PostgreSQL 18.4 (`language_learning_test`, port 5433).
- **Chỉ số chính & Độ tin cậy**: **Số query** và **Số dòng DB đọc** là các chỉ số chính có tính **xác định (deterministic)**, lặp lại giống nhau 100% qua mọi lần chạy độc lập. **Thời gian thực thi (ms)** chỉ mang tính tham khảo và nằm trong dải nhiễu dao động của CPU/hệ điều hành.

| Nhóm chức năng / API Endpoint | Chế độ | Số query (Trước 0.5) | Batch Lần / Dòng (Trước) | Dòng DB đọc (Trước) | Thời gian (Trước 0.5) | Response Size (Trước) | Số query (Sau P1/P2) | Batch Lần / Dòng (Sau) | Dòng DB đọc (Sau) | Thời gian (Sau P1/P2) | Response Size (Sau) | Ghi chú kỹ thuật & Đánh giá thay đổi |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Ghi nhận học tập theo đợt**:<br>`POST /api/study/sessions`<br>+ `POST /sessions/{id}/answers`<br>(Batch 20 câu) | **COLD**<br>**WARM** | 188 q<br>188 q | 0 (0 r)<br>0 (0 r) | 75 r<br>75 r | 1.026 ms<br>483 ms | 712 B<br>715 B | **208 q**<br>**208 q** | **1 (1 r)**<br>**1 (1 r)** | **75 r**<br>**75 r** | **1.213 ms**<br>**374 ms** | 718 B<br>721 B | Hibernate statement batching kích hoạt `b:1(1)` cho session. Vấn đề N+1 query lặp 20 câu sẽ được giải quyết triệt để ở Giai đoạn 3 (Batch SM-2 rewrite). |
| **Hàng đợi ôn tập hôm nay**:<br>`GET /api/study-plans/current/today` | **COLD**<br>**WARM** | 5 q<br>5 q | 0 (0 r)<br>0 (0 r) | 2.831 r<br>2.831 r | 350 ms<br>125 ms | 15.628 B<br>15.628 B | **5 q**<br>**5 q** | **0 (0 r)**<br>**0 (0 r)** | **6.761 r**<br>**6.761 r** | **497 ms**<br>**246 ms** | 545.899 B<br>545.899 B | Duy trì 5 queries. Đọc dữ liệu thẻ lên memory để lọc thẻ đến hạn; sẽ được tối ưu bằng SQL aggregation ở Giai đoạn 4. |
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

### 7.1. Bảng Đối Chiếu Chỉ Số Baseline B1 vs Giai Đoạn 3 (Đo Thực Tế Trên PostgreSQL 18.4)

*Tất cả số liệu đo trực tiếp qua `PerfBaselineRunnerIntegrationTest` trên database kiểm thử độc lập `language_learning_test` (port 5433).*

| STT | Endpoint / Kịch bản đo | Chỉ số | Baseline B1 (Trước P3) | Sau Giai đoạn 3 (Thực tế) | Tỷ lệ cải thiện | Đánh giá kiến trúc & Cơ chế tối ưu |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **1a** | **Ghi nhận 20 câu trả lời**<br>`POST /api/study/sessions`<br>+ `POST /answers` (20 câu)<br>*(Chưa chạm cap XP)* | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | **208 q**<br>1 (1 r)<br>75 r<br>**464 - 526 ms**<br>1.345 ms | **15 q**<br>4 (61 r)<br>44 r<br>**49 ms**<br>509 ms | **-92,8% queries**<br>-<br>-<br>**-89,9% thời gian**<br>-62,2% COLD | **Bulk SM-2 & Batch XP**: Gom 20 câu vào 1 query validate từ vựng `IN (...)`, 1 query check duplicate `IN (...)`, 1 query load progress `IN (...)`, 1 JDBC batch insert `study_answers`, 1 PostgreSQL native `INSERT ... ON CONFLICT DO UPDATE` batch upsert `study_progress`, và 4 queries cho batch XP. Query count giảm từ 208 xuống 15! |
| **1b** | **Ghi nhận 20 câu trả lời**<br>`POST /api/study/sessions`<br>+ `POST /answers` (20 câu)<br>*(Đã chạm cap XP)* | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | **188 q**<br>1 (1 r)<br>75 r<br>**303 ms**<br>401 ms | **14 q**<br>4 (61 r)<br>44 r<br>**52 ms**<br>47 ms | **-92,6% queries**<br>-<br>-<br>**-82,8% thời gian**<br>-88,3% COLD | Tương tự 1a, nhưng do user đã chạm Daily XP cap, bỏ qua 1 câu `addXpAtomic` nên chỉ còn đúng 14 queries. |
| **1c** | **Ghi nhận 100 câu trả lời**<br>`POST /api/study/sessions`<br>+ `POST /answers` (100 câu)<br>*(Chưa chạm cap XP)* | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | *(Chưa có ở B1,<br>ước tính ~1.008 q)* | **15 q**<br>4 (301 r)<br>204 r<br>**100 ms**<br>115 ms | **Độ phức tạp $O(1)$**<br>(100 câu vẫn tốn 15 queries) | **Chứng minh $O(1)$ query complexity**: Dù kích thước batch tăng gấp 5 lần (từ 20 lên 100 câu), số query giữ nguyên tuyệt đối 15 queries. Thời gian chỉ 100 ms. |
| **1d** | **Ghi nhận 100 câu trả lời**<br>`POST /api/study/sessions`<br>+ `POST /answers` (100 câu)<br>*(Đã chạm cap XP)* | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | *(Chưa có ở B1,<br>ước tính ~908 q)* | **14 q**<br>4 (301 r)<br>204 r<br>**75 ms**<br>74 ms | **Độ phức tạp $O(1)$**<br>(100 câu vẫn tốn 14 queries) | Số query giữ nguyên 14 queries khi tăng lên 100 câu. Thời gian thực thi chỉ 75 ms. |
| **2** | **PUT Deck (a: Sửa 500 thẻ có sẵn)**<br>`PUT /api/decks/{id}` | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | **2.501 q**<br>999 (1.000 r)<br>1.501 r<br>**1.958 - 2.271 ms**<br>2.839 ms | **7 q**<br>2 (1.000 r)<br>1.501 r<br>**140 ms**<br>231 ms | **-99,7% queries**<br>Batch gom thực sự<br>-<br>**-93,3% thời gian**<br>-91,9% COLD | **Bulk JDBC Update**: Thay dirty-checking N+1 bằng `jdbcTemplate.batchUpdate`. 1.000 dòng được cập nhật trọn vẹn trong đúng 2 batch JDBC (`b:2(1000)`). Số query giảm ngoạn mục từ 2.501 xuống 7. |
| **2'** | **PUT Deck (a': Sửa 500 thẻ không đổi)**<br>`PUT /api/decks/{id}` | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)**<br>Thời gian (COLD) | *(Trước đây tốn<br>2.501 queries)* | **4 q**<br>0 (0 r)<br>1.501 r<br>**36 ms**<br>26 ms | **-100% write queries**<br>(0 batch, 0 updates) | **Diff In-Memory**: So khớp toàn bộ thuộc tính thẻ và synonyms trong RAM trước khi gửi SQL. Nếu người dùng lưu bộ thẻ mà không sửa nội dung thẻ, 0 câu UPDATE/DELETE nào được phát sinh tới DB. |
| **3** | **PUT Deck (b: Thêm 500 thẻ mới)**<br>`PUT /api/decks/{id}` | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)** | **5 q**<br>0 (0 r)<br>501 r<br>**106 - 111 ms** | **5 q**<br>0 (0 r)<br>501 r<br>**74 ms** | **0% suy thoái**<br>(Duy trì tối ưu có sẵn) | Giữ nguyên đường dẫn bulk insert đa dòng `createCardsForDeckBatch`. |
| **4** | **PUT Deck (c: Xóa 500 thẻ)**<br>`PUT /api/decks/{id}` | **Số query**<br>Batch<br>Dòng đọc<br>**Thời gian (WARM)** | **9 q**<br>2 (2 r)<br>504 r<br>**44 - 71 ms** | **9 q**<br>2 (2 r)<br>504 r<br>**53 ms** | **0% suy thoái**<br>(Duy trì tối ưu có sẵn) | Giữ nguyên 9 queries warm, 504 dòng đọc. |
| **5** | **Khởi tạo session (Hard Gate Check)**<br>`POST /api/study/sessions` | **Số query** | **4 - 5 q** (qua `getCurrentPlan`) | **1 - 2 q** (qua `isHardGateBlocking`) | **Giảm 3 queries** | Khi không bật hard gate, chỉ 1 query kiểm tra trạng thái plan. Khi có hard gate, dùng `SELECT EXISTS (...) LIMIT 1` dừng ngay ở thẻ đầu tiên. |
