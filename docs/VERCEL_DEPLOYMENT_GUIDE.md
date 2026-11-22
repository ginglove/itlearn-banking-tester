# Hướng Dẫn Từng Bước Triển Khai NeoBank eKYC Trên Vercel + Neon Postgres

Tài liệu này cung cấp quy trình chuẩn từng bước (Step-by-Step) để triển khai toàn bộ ứng dụng **NeoBank eKYC Onboarding Platform** lên nền tảng **Vercel**, kết hợp với **Neon Serverless Postgres** và **Vercel Blob Storage**.

---

## 1. Tổng quan Kiến trúc Triển khai (Cloud Architecture)

- **Frontend & API Handlers:** Next.js 15 (App Router, Node.js Serverless Functions) lưu trữ trên Vercel.
- **Database:** Neon Serverless PostgreSQL:
  - Runtime queries: Kết nối qua HTTP Driver (`@neondatabase/serverless`) hoặc Pooled Connection (`pg.Pool`).
  - Drizzle Kit Migrations & Post-Migrate: Sử dụng kết nối trực tiếp (Unpooled Connection).
- **Blob Storage:** Vercel Blob (Client-side upload direct via `@vercel/blob/client` nhằm vượt qua giới hạn payload 4.5 MB của Serverless Function).
- **Multi-tenancy:** Quản lý môi trường học viên theo Sandbox (`sandbox_id`) độc lập.

---

## 2. Chuẩn bị Tài nguyên Cloud

Trước khi bắt đầu, chuẩn bị các tài khoản sau:
1. **GitHub Account:** Đã có quyền truy cập repository [https://github.com/ginglove/itlearn-banking-tester](https://github.com/ginglove/itlearn-banking-tester).
2. **Vercel Account:** Đăng ký / Đăng nhập tại [vercel.com](https://vercel.com).
3. **Neon Postgres Account:** Đăng ký / Đăng nhập tại [neon.tech](https://neon.tech).

---

## 3. Bước 1: Khởi tạo Cơ sở Dữ liệu trên Neon Postgres

1. Đăng nhập vào [Neon Console](https://console.neon.tech).
2. Nhấn nút **Create Project**:
   - **Project Name:** `neobank-ekyc`
   - **Postgres Version:** `16` (hoặc `15`+)
   - **Region:** Chọn `AWS / ap-southeast-1 (Singapore)` (để có độ trễ thấp nhất về Việt Nam).
3. Sau khi tạo xong, Neon sẽ hiển thị hộp thoại **Connection Details**:
   - Sao chép chuỗi kết nối **Pooled connection**:
     ```text
     postgres://neondb_owner:xxxx@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
     ```
     *(Đây sẽ là giá trị cho biến `DATABASE_URL`)*
   - Bỏ tích chọn checkbox *Pooled connection* để lấy chuỗi kết nối **Direct / Unpooled**:
     ```text
     postgres://neondb_owner:xxxx@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
     ```
     *(Đây sẽ là giá trị cho biến `DATABASE_URL_UNPOOLED`)*
4. *(Tùy chọn)* Bạn có thể chạy trước [db/init.sql](file:///Users/admin/Documents/itlearn-banking-tester/db/init.sql) trên Neon **SQL Editor** để tạo sẵn bảng và view. Tuy nhiên, lệnh build tự động (`npm run vercel-build`) cũng sẽ tự động chạy migration và post-migrate khi triển khai.

---

## 4. Bước 2: Tạo Vercel Blob Storage

Để hỗ trợ upload ảnh CCCD mặt trước/sau và video/selfie từ trình duyệt của người dùng:
1. Đăng nhập vào [Vercel Dashboard](https://vercel.com).
2. Vào mục **Storage** trên thanh menu điều hướng trên cùng (hoặc trong trang quản lý Team).
3. Nhấn **Create Database** (hoặc **Create Storage**) -> Chọn **Blob**.
4. Nhập thông tin:
   - **Store Name:** `neobank-ekyc-blob`
   - **Access Level:** Chọn `Public` (Do dữ liệu bài học là thông tin giả lập phục vụ đào tạo).
5. Nhấn **Create**.
6. Sau khi tạo xong, chọn tab **Settings**:
   - Tìm mục **Read-Write Token**.
   - Sao chép giá trị token (bắt đầu bằng `vercel_blob_rw_...`).
   *(Giá trị này sẽ dùng cho biến `BLOB_READ_WRITE_TOKEN`)*

---

## 5. Bước 3: Import Project lên Vercel

1. Trên Vercel Dashboard, nhấn **Add New...** -> Chọn **Project**.
2. Tại mục **Import Git Repository**:
   - Tìm repository `ginglove/itlearn-banking-tester`.
   - Nhấn nút **Import**.
3. Cấu hình **Project Settings**:
   - **Project Name:** `itlearn-banking-tester` (hoặc tên bạn mong muốn).
   - **Framework Preset:** `Next.js` (Vercel tự động nhận diện).
   - **Root Directory:** `./`
4. Cấu hình **Build and Output Settings**:
   - Mở rộng mục **Build and Output Settings**.
   - Bật công tắc **Build Command** (Override) và điền:
     ```bash
     npm run vercel-build
     ```
     *(Lệnh này sẽ tự động chạy `drizzle-kit migrate` -> `tsx db/post-migrate.ts` -> `next build`)*
   - **Install Command:** Giữ mặc định (`npm install`).

---

## 6. Bước 4: Cấu hình Biến Môi trường (Environment Variables)

Mở rộng mục **Environment Variables** trong màn hình cấu hình dự án trên Vercel và thêm đầy đủ các biến sau:

| Tên biến (Key) | Giá trị mẫu (Value) | Mô tả & Lưu ý |
|---|---|---|
| `DATABASE_URL` | `postgres://neondb_owner:***@ep-***-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` | Chuỗi kết nối Neon có Connection Pooler (phục vụ runtime queries). |
| `DATABASE_URL_UNPOOLED` | `postgres://neondb_owner:***@ep-***.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` | Chuỗi kết nối Neon trực tiếp không pooler (dùng cho Drizzle migrations & post-migrate). |
| `BLOB_READ_WRITE_TOKEN` | `vercel_blob_rw_...` | Token của Vercel Blob lấy ở Bước 2. |
| `SESSION_SECRET` | `4f8a3c9b2e1d7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a` | Chuỗi bí mật ký JWT (tối thiểu 32 ký tự). Tạo ngẫu nhiên bằng `openssl rand -hex 32`. |
| `TRAINER_PIN` | `123456` | Mã PIN bảo vệ bảng điều khiển quản trị `/trainer`. |
| `READONLY_DB_PASSWORD` | `readonly_secure_token_p90_xyz123` | Mật khẩu cho Postgres Role `ekyc_readonly` phục vụ SQL Playground. |
| `DEFAULT_PROFILE` | `training` | Chế độ mặc định của các Sandbox mới: `training` hoặc `reference`. |
| `DEFAULT_TODAY` | `2026-11-23` | Ngày giả lập hệ thống (YYYY-MM-DD). |

> [!TIP]
> Chọn phạm vi áp dụng cho cả 3 môi trường: **Production**, **Preview**, và **Development**.

---

## 7. Bước 5: Deploy & Theo dõi Tiến trình Build

1. Nhấn nút **Deploy**.
2. Theo dõi mục **Building Logs** trong giao diện Vercel Deployment.
3. Các tiến trình sẽ diễn ra theo đúng thứ tự:
   - `drizzle-kit migrate`: Áp dụng schema migration từ `db/migrations/`.
   - `tsx db/post-migrate.ts`: Khởi tạo role `ekyc_readonly`, tạo schema `learner` cùng các Views bảo mật, và seed dữ liệu mặc định cho sandbox `DEMO01`.
   - `next build`: Tối ưu hóa bundle và xuất bản các Route tĩnh / động.
4. Khi quá trình hoàn tất, màn hình hiển thị lời chúc mừng kèm đường dẫn tên miền Production (dạng `https://itlearn-banking-tester.vercel.app`).

---

## 8. Bước 6: Kiểm tra và Nghiệm thu Hệ thống (Verification)

Sau khi deploy thành công, truy cập các đường dẫn sau để kiểm tra:

### 8.1. Kiểm tra Health Endpoint
Truy cập: `https://<YOUR-VERCEL-DOMAIN>/api/dev/health`
Kết quả trả về JSON hợp lệ:
```json
{
  "status": "UP",
  "database": "OK",
  "sandboxesCount": 1,
  "clock": "2026-11-23",
  "profile": "training",
  "timestamp": "..."
}
```

### 8.2. Kiểm tra Giao diện Khách hàng (eKYC Onboarding)
Truy cập: `https://<YOUR-VERCEL-DOMAIN>/`
- Kiểm tra khung hiển thị di động 390px nằm giữa màn hình.
- Thử nghiệm luồng B1: Nhập SĐT `0987654321` -> Bấm "Gửi mã OTP".
- Mở "Hộp thư SMS (giả lập)" ở góc dưới để lấy mã OTP và hoàn tất xác thực.

### 8.3. Kiểm tra Tài liệu API Swagger UI
Truy cập: `https://<YOUR-VERCEL-DOMAIN>/docs`
- Kiểm tra toàn bộ 7 API Route Handlers được hiển thị đầy đủ với schema request/response chuẩn Mini-SRS v2.1.

### 8.4. Kiểm tra Learner SQL Playground
Truy cập: `https://<YOUR-VERCEL-DOMAIN>/sql`
- Thử chạy câu lệnh: `SELECT * FROM customers;`
- Kết quả trả về dữ liệu mẫu của sandbox hiện tại, trường mật khẩu nhạy cảm đã được lọc bỏ.

### 8.5. Kiểm tra Trainer Console
Truy cập: `https://<YOUR-VERCEL-DOMAIN>/trainer`
- Nhập mã PIN (theo biến `TRAINER_PIN`).
- Kiểm tra các chức năng: Chuyển đổi Profile (Training/Reference), chỉnh "Ngày hệ thống", Bật/tắt mô phỏng lỗi mạng, Reset dữ liệu sandbox.

---

## 9. Bước 7: Cập nhật Cấu hình Postman cho Học viên

1. Mở file [postman/NeoBank_eKYC_Environment.json](file:///Users/admin/Documents/itlearn-banking-tester/postman/NeoBank_eKYC_Environment.json).
2. Cập nhật biến `baseUrl`:
   ```json
   {
     "key": "baseUrl",
     "value": "https://<YOUR-VERCEL-DOMAIN>",
     "type": "default",
     "enabled": true
   }
   ```
3. Gửi bộ sưu tập [postman/NeoBank_eKYC_Collection.json](file:///Users/admin/Documents/itlearn-banking-tester/postman/NeoBank_eKYC_Collection.json) và file môi trường đã cập nhật cho học viên hoặc đội ngũ kiểm thử.

---

## 10. Xử lý Sự cố Thường gặp (Troubleshooting)

### Lỗi 1: `FUNCTION_PAYLOAD_TOO_LARGE` (HTTP 413)
- **Nguyên nhân:** Gửi file ảnh trực tiếp qua body của Serverless Function vượt quá giới hạn 4.5 MB của Vercel.
- **Giải pháp:** Hệ thống đã được thiết kế sử dụng Vercel Blob client-side token (`POST /api/v1/onboarding/upload-token`). Trình duyệt upload trực tiếp lên Blob Storage, sau đó API nhận URL để kiểm tra dung lượng qua `HEAD` request.

### Lỗi 2: Lỗi kết nối Cơ sở dữ liệu trong quá trình Build
- **Hiện tượng:** Log build báo lỗi `timeout` hoặc `connect ECONNREFUSED` tại bước migration.
- **Giải pháp:** Đảm bảo biến `DATABASE_URL_UNPOOLED` sử dụng chuỗi kết nối trực tiếp (Direct Connection không pooler) từ Neon Postgres và có tham số `?sslmode=require`.

### Lỗi 3: Quyền Role `ekyc_readonly` trên Neon
- **Hiện tượng:** Log post-migrate báo `permission denied for schema learner`.
- **Giải pháp:** Đảm bảo tài khoản kết nối trong `DATABASE_URL_UNPOOLED` là `neondb_owner` (owner mặc định có quyền cấp quyền role).

---

## 11. Cập nhật Code & Tự động Triển khai (CI/CD)

Vercel đã tự động kích hoạt tính năng **Continuous Deployment**:
- Mỗi khi bạn commit và push lên nhánh `main` (`git push origin main`), Vercel sẽ tự động kích hoạt build và cập nhật phiên bản mới nhất cho Production.
- Khi tạo Pull Request, Vercel sẽ tự động tạo môi trường **Preview Deployment** độc lập để kiểm thử trước khi merge.
