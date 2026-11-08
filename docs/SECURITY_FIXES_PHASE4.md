# BÁO CÁO CÁC BẢN VÁ BẢO MẬT GIAI ĐOẠN 4 (IDOR PREVENTION)

## 1. Phân Loại Mức Độ Nghiêm Trọng & Bằng Chứng Thực Nghiệm Trên Main
Trong đợt rà soát an ninh Phase 4, toàn bộ hệ thống đã được kiểm tra quyền sở hữu tài nguyên (IDOR / Multi-tenancy check). Cả **8 lỗ hổng** dưới đây đã được chứng minh thực nghiệm độc lập trên worktree nhánh `main` và được khắc phục hoàn toàn trên nhánh `perf/phase-4-read-paths`:

| STT | Endpoint | Lỗ hổng & Phương thức | Mức độ | HTTP trên `main` | HTTP sau vá | Bằng chứng & Tác động cụ thể trên nhánh `main` |
| :-: | :--- | :--- | :-: | :-: | :-: | :--- |
| **1** | `GET /api/decks/{id}/srs-forecast` | IDOR Read SRS Forecast | **CAO** | **200** | **404** | **Rò rỉ dữ liệu nhạy cảm**: User A đọc trộm toàn bộ tiến độ, phân bổ ghi nhớ và dự báo ôn tập 7 ngày thuộc bộ thẻ riêng tư của User B. |
| **2** | `GET /api/decks/{id}/srs-queue` | IDOR Read SRS Queue | **CAO** | **200** | **404** | **Rò rỉ toàn bộ nội dung thẻ**: User A đọc trộm danh sách thẻ cần học hôm nay cùng từ vựng, phiên âm, định nghĩa và ngữ cảnh của User B. |
| **3** | `POST /api/decks/{deckId}/synonym-challenges/evaluate` | IDOR Synonym Challenge | **TRUNG BÌNH** | **200** | **404** | **Ô nhiễm dữ liệu DB thực tế**: Đã kiểm chứng qua DB query trên `main`, khi A submit trên deck của B, hệ thống ghi nhận thành công 1 dòng mới vào bảng `synonym_challenge_history` gắn với `deck_id` của B! |
| **4** | `POST /api/decks/{deckId}/sentence-challenges/evaluate` | AI Abuse / LLM Quota Drain | **TRUNG BÌNH** | **200** | **404** | **Lạm dụng Token / Quota AI**: Đã kiểm chứng với request hợp lệ trên `main`, mock Gemini xác nhận `GeminiSentenceService.evaluateSentence()` bị gọi thật (HTTP 200) mà không kiểm tra quyền sở hữu deck, gây hao tổn quota AI. *(400 trước đó xảy ra do test environment thiếu Gemini API key)*. |
| **5** | `PATCH /api/wallpapers/{id}/active` | IDOR Wallpaper State Corruption | **THẤP** | **200** | **404** | **Sai lệch trạng thái UI**: Gửi ID wallpaper của B khiến toàn bộ wallpaper của A bị tắt (`false`) và trả về 200 OK giả tạo thay vì báo lỗi 404. |
| **6** | `POST /api/study-plans/preview` | Info Leak Deck Size | **TRUNG BÌNH** | **200** | **404** | **Rò rỉ số lượng thẻ**: User A biết trước chính xác số lượng từ vựng và số từ trùng lặp trong bộ thẻ riêng tư của User B. |
| **7** | `POST /api/study-plans` | Business Logic Flaw Plan Creation | **TRUNG BÌNH** | **201** | **404** | **Lỗi logic nghiệp vụ**: Lặng lẽ tạo lộ trình rỗng (201 Created) khi kèm deck của B thay vì từ chối hợp lệ. |
| **8** | `DELETE /api/study-plans/current/decks/{deckId}` | Bypass Deck Ownership Check | **THẤP** | **200** | **404** | **Sai mã phản hồi**: Trả về 200 OK kèm plan hiện tại của A khi gửi deck của B thay vì kiểm tra và báo 404. |

---

## 2. Commit Sửa Lỗi & Bộ Kiểm Thử Chứng Minh
- **Commit sửa lỗi**: `b087e93` (và các commit trước đó trong chuỗi Phase 4: `4.3`, `4.6`, `4.7`, `4.8`).
- **File sửa chính**:
  - `DeckService.java`: bổ sung kiểm tra quyền sở hữu deck với `userId` trong `getDeckForecast` và `getDeckStudyQueue`.
  - `SynonymChallengeService.java`: xác thực quyền sở hữu deck trước khi chấm điểm hoặc lấy danh sách.
  - `SentenceChallengeService.java`: chặn request trước khi chuyển tiếp sang LLM AI service.
  - `WallpaperService.java`: nạp hình nền kèm `userId` (`findByIdAndUserId`), ném 404 chuẩn xác.
  - `StudyPlanService.java`: xác thực chặt chẽ quyền sở hữu deck trong `createPlan`, `previewAddDecks`, `removeDeckFromPlan`.
- **Bộ kiểm thử bảo vệ (Regression Prevention)**:
  - `backend/src/test/java/com/languagelearning/backend/integration/IdorSecurityMatrixIntegrationTest.java`:
  - Bao phủ **30 scenarios** (27 IDOR True Attacks + 3 Isolation Checks). Kết quả: **30/30 PASSED (0 failures)**.

---

## 3. Quy Trình Rollout An Toàn & Khả Năng Tương Thích Ngược
1. **Thứ tự khuyến nghị**: **Deploy Backend trước, sau đó deploy Frontend**.
2. **Khả năng tự thích ứng của Frontend với Backend cũ (Zero-Downtime Resilience)**:
   - Trong `studyPlanService.getTodaySummary`: nếu gọi `/current/today/summary` nhận về **HTTP 404** (khi backend cũ chưa được deploy), frontend tự động fallback gọi `/current/today` một lần, tự tính các số đếm (`totalWords`, `dueWords`, `weakWords`, `newWords`) và lưu vào client cache.
   - Nhờ đó, ngay cả khi Frontend được deploy trước Backend cũ, giao diện badge trên dock và modal ôn tập vẫn hoạt động trơn tru 100% không bị vỡ lỗi.
3. **Kế hoạch Rollback (nếu có sự cố)**:
   - Backend mới tương thích ngược 100% với toàn bộ API cũ (không xóa endpoint công khai nào). Cả Frontend và Backend đều có thể rollback độc lập mà không gây xung đột hệ thống.
