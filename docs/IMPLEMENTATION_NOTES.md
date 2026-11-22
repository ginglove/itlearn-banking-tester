# GHI CHÚ TRIỂN KHAI & QUYẾT ĐỊNH THIẾT KẾ (IMPLEMENTATION NOTES)
### Dự án: NeoBank eKYC Onboarding (Dành cho khóa học Banking Tester)

Tài liệu này ghi nhận toàn bộ các quyết định kỹ thuật và nghiệp vụ tại những điểm mà tài liệu đặc tả Mini-SRS v2.1 chưa nêu rõ hoặc chưa quy định cụ thể, theo yêu cầu tại **Mục 0 và Mục 10 của BUILD PLAN**.

---

## 1. Ràng buộc trường Email tại Bước B1

- **Hiện trạng trong SRS:** Mục B1 chỉ ghi "nhập Số điện thoại (10 số) và Email", nhưng không nêu rõ Email có bắt buộc hay không, và không có mã lỗi riêng cho định dạng Email.
- **Quyết định thiết kế:**
  - `phoneNumber`: **Bắt buộc**.
  - `email`: **Không bắt buộc (Optional)**. Nếu người dùng nhập thì phải đúng định dạng email tiêu chuẩn; nếu để trống thì hệ thống vẫn chấp nhận và cấp OTP.
  - Lý do: Phù hợp với thông lệ của hầu hết các ngân hàng số tại Việt Nam (số điện thoại là định danh chính để gửi SMS OTP).

---

## 2. Chính sách Mật khẩu (Password Policy) tại Bước B5

- **Hiện trạng trong SRS:** Mục B5 chỉ ghi "tạo mật khẩu đăng nhập App", không quy định độ dài, loại ký tự hoặc các từ cấm.
- **Quyết định thiết kế:**
  - **Chế độ chuẩn (Reference Profile):**
    - Độ dài: từ 8 đến 20 ký tự.
    - Phải chứa ít nhất 1 chữ hoa (`A-Z`).
    - Phải chứa ít nhất 1 chữ thường (`a-z`).
    - Phải chứa ít nhất 1 chữ số (`0-9`).
    - Không được chứa số điện thoại đã đăng ký.
    - Không được chứa ngày sinh dạng `ddMMyyyy`.
  - **Chế độ đào tạo (Training Profile):**
    - Mọi chuỗi ký tự không rỗng đều được chấp nhận (D03) để phục vụ bài kiểm thử bẫy SRS của học viên.

---

## 3. Các trường bổ sung trong API `POST /onboarding/ekyc-submit`

- **Hiện trạng trong SRS:** Ví dụ mẫu trong SRS Mục 5 chỉ có 6 trường: `phoneNumber`, `idNumber`, `fullName`, `dob`, `expiryDate`, `faceMatchScore`. Nếu chỉ có 6 trường này thì Core Banking không nhận được mật khẩu, email và địa chỉ đã sửa tay tại bước 3A.
- **Quyết định thiết kế:**
  - API giữ nguyên 6 trường bắt buộc của SRS, đồng thời bổ sung 4 trường hỗ trợ:
    - `email` (string, optional)
    - `address` (string, optional: địa chỉ sau khi sửa tay tại 3A)
    - `password` (string, required: mật khẩu tạo tại B5)
    - `onboardingId` (string, required: mã phiên làm việc)
  - Phản hồi HTTP 200 thành công giữ chuẩn 100% cấu trúc của SRS:
    ```json
    {
      "responseCode": "00",
      "message": "Khoi tao tai khoan thanh cong",
      "data": { "cifNumber": "88001245", "accountNumber": "1903456789012", "status": "ACTIVE" }
    }
    ```
  - Sự sai lệch giữa đặc tả ban đầu của SRS và API thực tế là một bẫy có chủ đích để học viên phát hiện sự thiếu đồng bộ giữa tài liệu và API.

---

## 4. Hệ thống Mã Lỗi Bổ Sung (Error Codes)

Mini-SRS v2.1 chỉ định nghĩa 4 mã lỗi: `EKYC-01`, `EKYC-02`, `EKYC-03`, `EKYC-99`. Để hệ thống hoạt động đầy đủ trên môi trường số, các mã lỗi sau được bổ sung:

| Mã lỗi | HTTP Status | Diễn giải | Mục đích |
|---|---|---|---|
| `EKYC-04` | 400 | Khách hàng chưa đủ 18 tuổi | Bổ sung cho BR-101 (Chỉ có trong Reference profile) |
| `EKYC-05` | 409 | Bạn đã có tài khoản tại NeoBank | Bổ sung cho BR-105 khi trùng CCCD (Reference profile) |
| `VAL-400` | 400 | Dữ liệu không hợp lệ | Báo lỗi định dạng trường, lỗi can thiệp dữ liệu |
| `OTP-01` | 400 | Mã OTP không đúng hoặc đã hết hạn | Xử lý nhập sai hoặc quá hạn 60s |
| `OTP-02` | 429 | Số điện thoại tạm khóa 24 giờ | Khóa SĐT sau 5 lần nhập sai liên tiếp (BR-104) |
| `OTP-03` | 429 | Đã vượt số lần gửi lại mã | Khóa chức năng gửi lại sau 3 lần (BR-104) |
| `SES-01` | 423 | Phiên eKYC tạm khóa 30 phút | Khóa phiên sau 3 lần trượt khuôn mặt (Luồng 4A) |
| `AUTH-401`| 401 | Phiên làm việc không hợp lệ hoặc đã hết hạn | Kiểm soát xác thực JWT Bearer |

---

## 5. Kiến trúc Kết nối Database (Neon Postgres & Local Postgres)

- **Trên Vercel:** Kết nối với Neon Postgres qua driver HTTP serverless (`@neondatabase/serverless` + `drizzle-orm/neon-http`), hoàn toàn phi trạng thái (stateless), không duy trì kết nối TCP cố định.
- **Trong Local Dev & CI Test:** Hệ thống tự động nhận diện nếu `DATABASE_URL` là Postgres cục bộ (`localhost` / `127.0.0.1`) và chuyển sang sử dụng `pg.Pool` (`drizzle-orm/node-postgres`), giúp việc chạy test tự động trên máy dev diễn ra mượt mà và độc lập.

---

## 6. Cơ chế Tải Ảnh & Giới hạn 4.5 MB trên Vercel

- **Vấn đề kỹ thuật:** Vercel serverless function có giới hạn payload request tối đa **4.5 MB**. Trong khi đó quy tắc BR-102 cho phép ảnh tới 5 MB, và các test case biên BVA có thể dùng ảnh 5.1 MB. Nếu gửi file trực tiếp qua API Gateway sẽ bị lỗi `413 FUNCTION_PAYLOAD_TOO_LARGE`.
- **Giải pháp:**
  - Ứng dụng phía client sử dụng cơ chế **Client Upload** trực tiếp lên Vercel Blob thông qua token sinh bởi `POST /api/v1/onboarding/upload-token`.
  - Các API `/ocr` và `/face-check` chỉ nhận đường dẫn URL của ảnh. Dung lượng byte của ảnh được kiểm tra thông qua `HEAD Content-Length` hoặc kiểm tra file cục bộ trong `/samples/`.

---

## 7. Cơ chế Phân vùng Sandbox cho Nhiều Học Viên (Multi-tenant Sandbox)

- Mỗi học viên có một không gian làm việc riêng biệt được định danh bởi `sandboxId`.
- Học viên truy cập qua URL `/?s=CODE` (lưu vào cookie `sbx`) hoặc gửi header `X-Sandbox-Id: CODE` trong Postman.
- Mọi bảng dữ liệu đều có cột `sandbox_id`.
- Trang tra cứu SQL `/sql` sử dụng vai trò `ekyc_readonly` kết nối vào schema `learner` với các View được lọc tự động theo biến session:
  `WHERE sandbox_id = current_setting('app.sandbox_id', true);`
  Đảm bảo học viên không thể thấy dữ liệu của nhau và không thể xem password hash hay OTP hash.
