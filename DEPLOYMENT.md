# Hướng Dẫn Đóng Gói & Triển Khai (Deployment Guide) - LanguageLearning

Dự án **LanguageLearning** đã được chuẩn bị đầy đủ các tệp cấu hình đóng gói chuẩn Docker và cấu hình Cloud (Render, Vercel, Railway, VPS).

---

## 🚀 Cách 1: Chạy toàn bộ hệ thống bằng Docker Compose (Khuyên dùng cho VPS / Máy chủ riêng)

Tất cả các dịch vụ (PostgreSQL 16, Spring Boot Backend, React Vite Nginx Frontend) sẽ được đóng gói và khởi chạy tự động chỉ bằng **1 lệnh duy nhất**.

### Bước 1: Chuẩn bị file môi trường
Tạo file `.env` từ file mẫu:
```bash
cp .env.production.example .env
```
Chỉnh sửa `DB_PASSWORD` và `JWT_SECRET` trong file `.env` cho an toàn.

### Bước 2: Khởi chạy hệ thống
Chạy lệnh sau tại thư mục gốc của dự án:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Bước 3: Kiểm tra trạng thái
```bash
docker compose -f docker-compose.prod.yml ps
```
- **Web App Frontend:** Truy cập tại `http://<IP-may-chu>` hoặc `http://localhost`
- **Backend API:** Tự động định tuyến qua `http://<IP-may-chu>/api/`
- **Dữ liệu Database:** Tự động lưu trữ an toàn trong Docker Volume `postgres_data`.

Để dừng hệ thống:
```bash
docker compose -f docker-compose.prod.yml down
```

---

## ☁️ Cách 2: Triển khai Miễn Phí lên Cloud (Render.com)

Render hỗ trợ triển khai cả Database PostgreSQL, Backend và Frontend hoàn toàn miễn phí. Dự án đã có sẵn tệp `render.yaml` (Infrastructure-as-Code).

### Các bước thực hiện:
1. Đẩy mã nguồn dự án lên GitHub / GitLab cá nhân của bạn.
2. Đăng nhập vào [Render.com](https://render.com/).
3. Bấm nút **New +** -> Chọn **Blueprint**.
4. Kết nối với Repository GitHub của bạn.
5. Render sẽ tự động đọc tệp `render.yaml` và tạo 3 dịch vụ liên kết với nhau:
   - **`language-learning-db`**: Cơ sở dữ liệu PostgreSQL Managed.
   - **`language-learning-backend`**: Spring Boot Web Service chạy trên Docker.
   - **`language-learning-frontend`**: React + Vite Static Site (tự động kết nối với API Backend).
6. Bấm **Apply** và chờ Render hoàn tất build (khoảng 3–5 phút). Bạn sẽ nhận được đường link web trực tiếp để gửi bạn bè trải nghiệm!

---

## ⚡ Cách 3: Tách Frontend (Vercel) & Backend (Render / Railway)

Nếu bạn muốn tốc độ tải trang Frontend cực nhanh qua mạng lưới CDN toàn cầu của Vercel:

1. **Backend & Database:** Deploy lên [Render.com](https://render.com) hoặc [Railway.app](https://railway.app) bằng `backend/Dockerfile`. Bạn sẽ có link Backend dạng: `https://your-backend.onrender.com`.
2. **Frontend:**
   - Đăng nhập [Vercel.com](https://vercel.com).
   - Import thư mục `frontend/`.
   - Trong mục **Environment Variables**, thêm:
     ```env
     VITE_API_BASE_URL = https://your-backend.onrender.com
     ```
   - Bấm **Deploy**. Vercel sẽ tự động build và cung cấp link truy cập miễn phí dạng `https://your-app.vercel.app` với SSL HTTPS tự động!
