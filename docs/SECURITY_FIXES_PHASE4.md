# BÁO CÁO CÁC BẢN VÁ BẢO MẬT GIAI ĐOẠN 4 (IDOR PREVENTION)

## 1. Tổng Quan Lỗ Hổng Được Khắc Phục Trên Main
Trong đợt rà soát an ninh Phase 4, toàn bộ hệ thống đã được kiểm tra quyền sở hữu tài nguyên (IDOR / Multi-tenancy check). Tất cả **8 lỗ hổng** dưới đây đã được chứng minh thực nghiệm độc lập trên nhánh `main` (trả về 200/201/400 thay vì 404) và đã được khắc phục hoàn toàn trên nhánh `perf/phase-4-read-paths`.

| STT | Endpoint | Lỗ hổng & Phương thức | HTTP trên `main` | HTTP sau vá | Tác động cụ thể trên nhánh `main` |
| :-: | :--- | :--- | :-: | :-: | :--- |
| **1** | `GET /api/decks/{id}/srs-forecast` | IDOR Read SRS Forecast | **200** | **404** | User A đọc trộm toàn bộ tiến độ và dự báo ôn tập 7 ngày của User B. |
| **2** | `GET /api/decks/{id}/srs-queue` | IDOR Read SRS Queue | **200** | **404** | User A đọc trộm toàn bộ danh sách thẻ ôn tập, từ vựng, phiên âm của User B. |
| **3** | `POST /api/decks/{id}/synonym-challenges/evaluate` | IDOR Synonym Challenge | **200** | **404** | User A submit chấm điểm trên deck của B, làm sai lệch dữ liệu lịch sử của B. |
| **4** | `POST /api/decks/{id}/sentence-challenges/evaluate` | AI Abuse / IDOR Sentence | **400** | **404** | Không kiểm tra ownership deck, request lọt vào Gemini AI gây tốn API quota. |
| **5** | `PATCH /api/wallpapers/{id}/active` | IDOR Wallpaper State Corruption | **200** | **404** | Gửi ID của B khiến toàn bộ wallpaper của A bị tắt (`false`) và trả về 200 OK giả tạo. |
| **6** | `POST /api/study-plans/preview` | Info Leak Deck Size | **200** | **404** | User A biết trước số lượng từ và số từ trùng lặp trong bộ thẻ riêng tư của User B. |
| **7** | `POST /api/study-plans` | Business Logic Flaw Plan Creation | **201** | **404** | Lặng lẽ tạo lộ trình rỗng (201 Created) khi kèm deck của B thay vì từ chối hợp lệ. |
| **8** | `DELETE /api/study-plans/current/decks/{deckId}` | Bypass Deck Ownership Check | **200** | **404** | Trả về 200 OK kèm plan hiện tại của A khi gửi deck của B thay vì báo lỗi 404. |

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

## 3. Quy Trình Rollout An Toàn Vào Production
Để đảm bảo trải nghiệm người dùng không bị gián đoạn (Zero Downtime) và không xảy ra lỗi 404 trên client:

```
[Bước 1: Deploy Backend] ───(Hoạt động song song)───> [Bước 2: Deploy Frontend]
   - Hỗ trợ cả /current/today                             - Gọi /current/today/summary cho badge/dock
   - Mở mới /current/today/summary                        - Chỉ gọi /current/today ở StudySessionModal
```

1. **Thứ tự bắt buộc**: **Deploy Backend trước, sau đó deploy Frontend**.
2. **Lý do kỹ thuật**:
   - Backend mới bổ sung endpoint `@GetMapping("/current/today/summary")` nhưng **vẫn giữ nguyên 100%** endpoint `@GetMapping("/current/today")`.
   - Nếu backend deploy trước: Frontend phiên bản cũ đang chạy trên trình duyệt người dùng vẫn gọi `/current/today` bình thường mà không bị ảnh hưởng.
   - Nếu frontend deploy trước backend: Frontend mới sẽ gọi ngay `/api/study-plans/current/today/summary`, nhưng backend cũ chưa có route này sẽ trả về **HTTP 404 Not Found**, dẫn đến vỡ badge trên dock và modal đếm từ.
3. **Kế hoạch Rollback (nếu có sự cố)**:
   - Bản thân backend mới không thay đổi schema database cũ và tương thích ngược hoàn toàn. Có thể rollback frontend độc lập nếu phát sinh lỗi UI mà không cần rollback backend.
