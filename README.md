# NeoBank Digital Banking — Hệ thống Giả lập eKYC Onboarding
### Ứng dụng thực hành kiểm thử dành cho Khóa học Banking Tester (Buổi 1 & 2)

Chào mừng các bạn học viên đến với hệ thống ngân hàng số **NeoBank**! Ứng dụng này được xây dựng bám sát theo tài liệu đặc tả nghiệp vụ **Mini-SRS v2.1 (SRS-NB-001)** để các bạn thực hành kiểm thử trực tiếp trên cả giao diện Web Mobile và giao diện lập trình ứng dụng (API).

---

## 1. Hướng Dẫn Truy Cập & Kết Nối Sandbox

Mỗi học viên được giảng viên cấp một đường link riêng gắn với mã Sandbox của mình:
```text
https://<domain>/?s=<MA_SANDBOX>
# Ví dụ khi chạy trên máy: http://localhost:3000/?s=DEMO01
```
- Khi mở link này, trình duyệt sẽ tự động lưu mã sandbox vào cookie.
- Mọi dữ liệu mở tài khoản, tin nhắn SMS OTP và nhật ký thao tác của bạn sẽ nằm trong không gian làm việc riêng biệt, không bị trùng lẫn với các bạn học viên khác.

---

## 2. Các Tiện Ích Hỗ Trợ Kiểm Thử

1. **Hộp thư SMS Giả lập (Fake SMS Inbox):**
   - Tại màn hình nhập mã OTP (Bước 2), bạn có thể bấm vào nút **"Hộp thư SMS (giả lập)"** ở góc trên bên phải để xem ngay mã OTP vừa được hệ thống gửi về cho số điện thoại của bạn, kèm nút bấm điền tự động.
   - Bạn cũng có thể tra cứu nhanh qua API: `GET /api/dev/sms?phone=09xxxxxxxx`.
2. **Tài liệu & Thử nghiệm API trực tiếp (Swagger UI):**
   - Truy cập trang `/docs` (hoặc bấm nút **"Swagger API"** ở đầu trang) để xem danh sách đầy đủ các endpoint theo chuẩn OpenAPI 3.0 và chạy thử request trực tiếp trên trình duyệt.
3. **Trang Tra Cứu Dữ Liệu SQL (SQL Playground):**
   - Truy cập trang `/sql` (hoặc bấm nút **"SQL Tra cứu"**) để viết các câu lệnh `SELECT` kiểm tra dữ liệu khách hàng, số dư tài khoản CASA, mã CIF sau khi hoàn tất luồng eKYC.
4. **Ngày Hệ Thống Giả Lập:**
   - Dưới chân màn hình điện thoại có dòng chữ hiển thị **Ngày hệ thống (System Date)** (mặc định là `23/11/2026`).
   - Mọi quy tắc tính tuổi mở tài khoản (BR-101) và hạn sử dụng CCCD (BR-102) đều được đối chiếu so với ngày hệ thống này.

---

## 3. Danh Sách Dữ Liệu Khách Hàng Mẫu (Persona Sheet)

Hệ thống đã tích hợp sẵn thư viện ảnh mẫu CCCD hai mặt và ảnh sinh trắc học để các bạn lựa chọn ngay trên giao diện:

| Mã Persona | Số CCCD | Họ và tên | Ngày sinh | Hạn sử dụng CCCD | Mục đích thử nghiệm |
|:---:|:---:|---|:---:|:---:|---|
| **P01** | `001098001234` | NGUYEN VAN AN | 15/05/1998 | 15/05/2038 | Dữ liệu chuẩn (khớp ví dụ trong SRS Mục 5) |
| **P02** | `079200004567` | TRAN THI BINH | 01/01/2000 | 01/01/2040 | Địa chỉ thường trú có ký tự đặc biệt / lỗi OCR (Luồng 3A) |
| **P03** | `001208001111` | LE MINH CUONG | 23/11/2008 | 23/11/2048 | Khách hàng tròn 18 tuổi đúng ngày hôm nay |
| **P04** | `001208002222` | PHAM THU DUNG | 24/11/2008 | 24/11/2048 | Khách hàng sinh nhật ngày 24/11 (ngày mai mới tròn 18 tuổi) |
| **P05** | `001210003333` | VO HOANG EM | 01/06/2010 | 01/06/2050 | Khách hàng 16 tuổi |
| **P06** | `001090000003` | HOANG VAN GIANG | 03/03/1990 | 03/03/2030 | Khách hàng kiểm tra trùng lặp hồ sơ CCCD |
| **P07** | `001095004444` | DANG THI HANH | 07/07/1995 | 23/11/2026 | CCCD hết hạn đúng ngày hệ thống hôm nay |
| **P08** | `001055005555` | BUI VAN KHOA | 02/02/1955 | KHONG THOI HAN | CCCD không thời hạn (người cao tuổi) |
| **P09** | `001099006666` | NGO THI LAN | 09/09/1999 | 09/09/2025 | CCCD đã hết hạn sử dụng |

**Dữ liệu Số điện thoại kiểm thử:**
- Số `0911111111`: Đã được đăng ký từ trước trên hệ thống (dùng kiểm thử mã lỗi `EKYC-03`).
- Bất kỳ số điện thoại 10 số nào khác bắt đầu bằng `03, 05, 07, 08, 09` đều là số điện thoại mới.

---

## 4. Hướng Dẫn Sử Dụng Postman (Kiểm Thử API)

Thư mục `postman/` trong tài liệu gồm 2 file:
1. `NeoBank_eKYC_Collection.json`: Toàn bộ các request tương ứng từ bước B1 đến B6.
2. `NeoBank_eKYC_Environment.json`: Môi trường chứa các biến `baseUrl`, `sandboxId`, `onboardingId`, `onboardingToken`.

**Các bước sử dụng:**
1. Mở Postman → Bấm **Import** → Chọn cả 2 file trên.
2. Chọn Environment là **"NeoBank eKYC Environment"**.
3. Điền đúng biến `baseUrl` (VD: `http://localhost:3000/api/v1` hoặc URL production Vercel) và `sandboxId` được cấp.
4. Chạy tuần tự các request: Sau khi chạy request **Request OTP**, mã `onboardingId` sẽ tự động được lưu; sau khi chạy **Verify OTP**, mã `onboardingToken` sẽ tự động được gán vào header của các request tiếp theo!

---

## 5. Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Local Development)

### Yêu cầu môi trường:
- Node.js version 20 trở lên (`node -v`)
- PostgreSQL đang chạy (mặc định database `neobank_ekyc` trên cổng 5432)

### Các bước cài đặt:

**Trên macOS / Linux:**
```bash
git clone <repo-url>
cd itlearn-banking-tester
npm install
cp .env.example .env.local
npm run db:migrate
npx tsx db/post-migrate.ts
npm run gen:samples
npm test          # Chạy kiểm thử tự động
npm run dev       # Khởi chạy server tại http://localhost:3000
```

**Trên Windows (PowerShell):**
```powershell
git clone <repo-url>
cd itlearn-banking-tester
npm install
Copy-Item .env.example .env.local
npm run db:migrate
npx tsx db/post-migrate.ts
npm run gen:samples
npm test
npm run dev
```

---

## 6. Bài Tập Về Nhà Buổi 1 (Homework Assignment)

> **Yêu cầu:**
> Thực thi tối thiểu **12 Test Scenario** bạn đã thiết kế ở Buổi 1 trên ứng dụng NeoBank này.
>
> Với mỗi kịch bản kiểm thử, ghi chép vào Bảng kết quả theo mẫu:
> 1. **Mã TS (Scenario ID)**
> 2. **Dữ liệu sử dụng (Persona / Ảnh mẫu)**
> 3. **Các bước thực hiện**
> 4. **Kết quả mong đợi (Theo đặc tả Mini-SRS v2.1)**
> 5. **Kết quả thực tế quan sát được trên ứng dụng / API**
> 6. **Đánh giá: Pass hay Fail**
> 7. **Bằng chứng kiểm thử (Ảnh chụp màn hình hoặc gói tin Request / Response)**
> 8. **Mục SRS liên quan (đối với các kịch bản phát hiện lỗi / Fail)**
