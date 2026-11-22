# BIÊN BẢN NGHIỆM THU & BẢNG KIỂM TRA (VERIFICATION REPORT)
### Ứng dụng: NeoBank eKYC Onboarding (SIT Banking Tester Training App)

Báo cáo nghiệm thu theo tiêu chuẩn **Mục 13 của BUILD PLAN**.

---

## 1. Kết quả Kiểm thử Tự động (Automated Test Suites)

- Lệnh chạy: `npm test` (Vitest v3.2.7)
- Tổng số file test: **3 file**
- Tổng số test case: **23 test case (100% PASS)**

| Bộ kiểm thử | Số test | Trạng thái | Nội dung bao phủ |
|---|---|---|---|
| `tests/database.test.ts` | 2 | **PASSED** | Khởi tạo seed data 3 khách hàng; Kiểm tra tính cách ly dữ liệu giữa 2 sandbox |
| `tests/api-reference.test.ts` | 8 | **PASSED** | Luồng chuẩn theo Mini-SRS v2.1: BR-101 (tuổi), BR-102 (CCCD), BR-103 (khuôn mặt 85%), BR-104 (OTP lock 5 lần, 3 resends), BR-105, Happy Path P01 |
| `tests/intentional-defects.test.ts` | 13 | **PASSED** | Ma trận 13 x 2 kiểm chứng sự tồn tại của 13 lỗi cài sẵn trên profile `training` và sự chuẩn xác trên profile `reference` |

---

## 2. Bảng Kiểm Tra Nghiệm Thu (Acceptance Checklist)

| STT | Tiêu chí kiểm tra (Acceptance Criteria) | Kết quả | Bằng chứng kiểm tra |
|:---:|---|:---:|---|
| 1 | Mọi mã SRS (`B1–B6`, `3A`, `4A`, `6A`, `BR-101–105`, `EKYC-01/02/03/99`) đều được cài đặt và hiển thị đúng trong response/logs | **ĐẠT** | Xem `public/openapi.yaml`, `tests/api-reference.test.ts`, `app/api/v1/**` |
| 2 | Cấu trúc request & response của `/ekyc-submit` khớp 100% ví dụ mẫu trong SRS Mục 5 đối với Persona P01 | **ĐẠT** | `POST /api/v1/onboarding/ekyc-submit` trả về `{ "responseCode": "00", "message": "Khoi tao tai khoan thanh cong", "data": { ... } }` |
| 3 | Lệnh kiểm tra từ cấm: `grep -riE "\b(bug\|bugs\|defect\|defects\|fault\|faults\|seeded\|intentional)\b" app lib components` | **ĐẠT** | Trả về 0 kết quả (Clean! 0 matches found) |
| 4 | Không lộ source maps, không lộ mã nguồn `policy.ts`, không để lộ link `/trainer` trên giao diện học viên | **ĐẠT** | `next.config.ts`: `productionBrowserSourceMaps: false`; không có thẻ `<a>` hoặc link dẫn tới `/trainer` trong giao diện học viên |
| 5 | Hai sandbox sử dụng đồng thời hoàn toàn độc lập, không nhìn thấy dữ liệu của nhau | **ĐẠT** | Đã kiểm chứng qua `tests/database.test.ts` và cơ chế `WHERE sandbox_id = current_setting('app.sandbox_id', true)` của PostgreSQL |
| 6 | Tính năng Reset dữ liệu trong `/trainer` khôi phục dữ liệu gốc dưới 3 giây | **ĐẠT** | API `/api/trainer/reset` hoàn thành trong ~45ms - 150ms |
| 7 | Thay đổi ngày hệ thống giả lập tác động lập tức đến kết quả kiểm tra tuổi và hạn CCCD cho P03, P04, P07 | **ĐẠT** | `evaluateAge` và `evaluateDocumentExpiry` sử dụng hàm `getSimulatedDate` lấy ngày từ `settings` của sandbox |
| 8 | Toàn bộ 13 điểm lỗi cài sẵn (D01 – D13) đều được tái hiện thành công và có test tự động kiểm chứng | **ĐẠT** | 13 test trong `tests/intentional-defects.test.ts` đều xanh |

---

## 3. Ma trận Kiểm thử 13 Điểm Lỗi (Profile Matrix 13 x 2)

| Mã lỗi | Hạng mục | Kết quả Profile `training` | Kết quả Profile `reference` | Trạng thái Test |
|---|---|---|---|:---:|
| **D01** | Ngưỡng khuôn mặt | Điểm 80.0% được chấp nhận | Điểm 80.0% bị từ chối EKYC-02 | **PASS** |
| **D02** | Độ tuổi mở tài khoản | P04 (mai đủ 18) được mở tài khoản | P04 bị từ chối mã EKYC-04 | **PASS** |
| **D03** | Ràng buộc mật khẩu | Mật khẩu "1" được chấp nhận | Mật khẩu "1" bị từ chối VAL-400 | **PASS** |
| **D04** | Điểm số từ Client | Bỏ qua kết quả khuôn mặt, tin điểm body | Kiểm tra session; bắt buộc phải đạt | **PASS** |
| **D05** | Trùng lặp số CCCD | Trả về mã lỗi 500 EKYC-99 | Trả về mã lỗi 409 EKYC-05 | **PASS** |
| **D06** | Thao tác lại sau rớt mạng | Tạo thêm 1 CIF trùng CCCD | Trả về CIF ban đầu (Idempotent) | **PASS** |
| **D07** | Can thiệp tên qua API | Nhận và lưu Họ tên bị can thiệp | Từ chối thay đổi Họ tên (VAL-400) | **PASS** |
| **D08** | Biên dung lượng ảnh | 100 KB bị loại; 5.1 MB được nhận | 100 KB được nhận; 5.1 MB bị loại | **PASS** |
| **D09** | Xử lý ngày hết hạn | Hết hạn hôm nay được nhận; Không thời hạn sập 500 | Hết hạn hôm nay bị từ chối; Không thời hạn được nhận | **PASS** |
| **D10** | Ràng buộc đầu số API | Chấp nhận đầu số 02 qua API | Từ chối đầu số 02 (VAL-400) | **PASS** |
| **D11** | Nơi lưu khóa 30 phút | Lưu client (F5 tải lại trang là hết khóa) | Lưu server DB (`locked_until`) | **PASS** |
| **D12** | Số lần gửi lại OTP | Cho phép gửi lại lần thứ 4 | Chặn ở lần thứ 4 (OTP-03/429) | **PASS** |
| **D13** | Mã trạng thái HTTP | Giấy tờ hết hạn trả về HTTP 200 | Giấy tờ hết hạn trả về HTTP 400 | **PASS** |
