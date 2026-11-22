# HƯỚNG DẪN GIẢNG VIÊN (TRAINER GUIDE) — NeoBank eKYC
### Khóa học: Banking Tester 1-1 (Buổi 1: eKYC & Mở tài khoản thanh toán)

> ⚠️ **BẢO MẬT TUYỆT ĐỐI:** File này chỉ dành riêng cho Giảng viên (Trainer).
> **KHÔNG ĐƯỢC CHIA SẺ** file này hoặc thư mục `trainer/` cho học viên, không commit vào repository public.

---

## 1. Thông tin đăng nhập & Cấu hình Giảng viên

- **Đường dẫn trang quản trị:** `/trainer`
- **Mã PIN mặc định:** Được cấu hình qua biến môi trường `TRAINER_PIN` (Mặc định trong development: `123456`, local: `888888`).
- **Thời lượng phiên đăng nhập:** 8 giờ (qua signed cookie httpOnly hoặc header `X-Trainer-Pin`).

---

## 2. Quản lý Sandbox Học viên

1. **Khởi tạo Sandbox:**
   - Vào `/trainer` → Bấm **"Tạo Sandbox Mới"**.
   - Nhập tên học viên (VD: `Học viên Nguyễn Văn A`) và mã sandbox (VD: `HVA01`).
   - Hệ thống tự động khởi tạo sandbox và nạp sẵn 3 khách hàng mẫu.
2. **Cấp link cho học viên:**
   - Bấm nút **"Copy link học viên"** → Định dạng: `https://<domain>/?s=<CODE>`.
   - Học viên mở link này 1 lần duy nhất trên trình duyệt, mã sandbox sẽ được lưu vào cookie `sbx`.
   - Khi học viên dùng Postman: thêm header `X-Sandbox-Id: <CODE>`.
3. **Cách ly dữ liệu (Data Isolation):**
   - Mọi thao tác eKYC, bản ghi khách hàng, tài khoản, SMS outbox, nhật ký API logs và cấu hình hệ thống (ngày giả lập, network drop) hoạt động **độc lập 100% giữa các sandbox**.
   - Reset sandbox của một học viên sẽ không bao giờ ảnh hưởng tới học viên khác.

---

## 3. Danh mục 13 Điểm Lỗi Cài Sẵn (Intentional Defects) — Profile `training`

Tất cả các điểm lỗi dưới đây chỉ xuất hiện khi sandbox ở profile **`training`**. Khi chuyển sang profile **`reference`**, hệ thống sẽ xử lý chuẩn xác 100% theo đúng quy tắc nghiệp vụ ngân hàng.

| Mã | Hạng mục | Hành vi thực tế (Training) | Hành vi kỳ vọng (Reference / SRS) | Cách phát hiện & Tái hiện | Liên kết SRS |
|---|---|---|---|---|---|
| **D01** | Ngưỡng so khớp khuôn mặt | Điểm khớp ≥ **80.0%** đã cho qua (thông báo lỗi dùng sai ngưỡng). | Chỉ cho qua khi điểm khớp ≥ **85.0%** (BR-103). | Chọn ảnh selfie **Mẫu 4** (điểm 80.0%) → Hệ thống vẫn báo đạt và cho tiếp tục. | Bẫy SRS 1: BR-103 vs Bảng mã lỗi EKYC-02 |
| **D02** | Độ tuổi mở tài khoản | Tuổi = Năm hiện tại − Năm sinh (bỏ qua ngày/tháng). Không chặn người dưới 18 tuổi. | Tính đủ ngày sinh so với ngày hệ thống (BR-101). Dưới 18 tuổi từ chối mã EKYC-04. | Chọn Persona **P04** (ngày mai mới sinh nhật 18 tuổi) → Tài khoản vẫn được khởi tạo thành công. | Bẫy SRS 2: BR-101 |
| **D03** | Chính sách mật khẩu | Mọi mật khẩu không rỗng đều được chấp nhận (kể cả số `1`, hoặc SĐT). | Mật khẩu 8–20 ký tự, gồm chữ hoa, chữ thường, số; không chứa SĐT hay ngày sinh. | Tại màn hình S06, nhập mật khẩu là `1` hoặc nhập chính số điện thoại → Hệ thống vẫn tạo tài khoản. | Bẫy SRS 3: Mục B5 |
| **D04** | Tin tưởng điểm từ Client | API `/ekyc-submit` bỏ qua kết quả kiểm tra khuôn mặt của phiên và chỉ tin vào `faceMatchScore` gửi trong body. | Server phải kiểm tra điểm lưu trong session; nếu session chưa đạt hoặc điểm gửi lên sai lệch → Báo lỗi VAL-400. | Dùng Postman: Gọi submit với `faceMatchScore: 99.0` sau khi bước face-check bị fail → Vẫn mở được tài khoản. | Bonus B1 (Lỗ hổng bảo mật) |
| **D05** | Trùng lặp số CCCD | Khách hàng đã có CIF → API trả về **500 EKYC-99** (Lỗi hệ thống chung). | Phải trả về **409 EKYC-05** và chuyển hướng sang màn hình Quên mật khẩu (BR-105). | Chọn Persona **P06** (CCCD `001090000003` đã có CIF trong hệ thống) → Nhận mã lỗi 500 EKYC-99. | Bonus B2 / BR-105 |
| **D06** | Thao tác lại sau mất mạng | Khi bật giả lập rớt mạng (`dropAfterCoreCommit`), thao tác lại tạo ra **CIF thứ hai** cho cùng số CCCD. | Với cùng `onboardingId`, hệ thống phải hoàn tất hồ sơ dở dang và trả về CIF ban đầu (Idempotent). | Bật toggle `dropAfterCoreCommit` → Submit bị lỗi 500 → Tắt toggle và submit lại → Vào `/trainer` xem bảng `customers` thấy 2 CIF trùng số CCCD. | Bonus B3 / Luồng 6A |
| **D07** | Can thiệp trường định danh qua API | Giao diện khóa Họ tên/Ngày sinh, nhưng gửi qua API body giá trị khác thì hệ thống vẫn nhận và lưu vào DB. | Họ tên và Ngày sinh phải khớp 100% dữ liệu OCR đã bóc tách; nếu sửa đổi phải từ chối (VAL-400). | Dùng Postman: Sửa trường `fullName` trong body `/ekyc-submit` thành tên khác → Kiểm tra DB thấy lưu tên bị can thiệp. | Luồng 3A |
| **D08** | Biên dung lượng ảnh | Ảnh đúng **100 KB** bị từ chối; ảnh tới **5.5 MB** vẫn được chấp nhận. | Dung lượng hợp lệ từ 100 KB đến 5 MB (bao gồm cả hai biên 100 KB và 5 MB). | Gọi OCR với file mẫu `/samples/size/100KB.jpg` → Bị lỗi từ chối; gọi với `/samples/size/5_1MB.jpg` → Lại được chấp nhận. | Bonus B8 / BR-102 |
| **D09** | Xử lý ngày hết hạn CCCD | CCCD hết hạn **đúng ngày hôm nay** vẫn được chấp nhận; CCCD "Không thời hạn" bị sập lỗi 500. | Hết hạn ≤ ngày hiện tại phải từ chối (EKYC-01); CCCD "Không thời hạn" là hợp lệ. | Chọn Persona **P07** (hết hạn hôm nay) → Vẫn cho qua. Chọn Persona **P08** ("Không thời hạn") → Báo lỗi 500. | Bonus B6 / BR-102 |
| **D10** | Ràng buộc đầu số điện thoại | Giao diện chặn đầu số lạ, nhưng API chấp nhận mọi chuỗi 10 chữ số (VD: `0212345678`). | API phải kiểm tra chặt chẽ đầu số hợp lệ (03, 05, 07, 08, 09) và trả về VAL-400. | Dùng Postman: Gửi `POST /onboarding/otp/request` với `phoneNumber: "0212345678"` → Vẫn cấp OTP thành công. | Mục 5 (API Spec) |
| **D11** | Khóa phiên eKYC 30 phút | Khóa 30 phút chỉ lưu ở Client/Trình duyệt; bấm F5 tải lại trang là thử tiếp được. | Khóa phiên phải lưu ở Server (`locked_until` trong DB) và từ chối mã SES-01/423 kể cả khi tải lại trang. | Cố tình thử xác thực khuôn mặt trượt 3 lần → Bị khóa 30 phút → Bấm Refresh/F5 → Lại được thao tác bình thường. | Luồng 4A |
| **D12** | Giới hạn gửi lại mã OTP | Cho phép gửi lại OTP lần thứ 4; gửi lại mã không reset bộ đếm lần nhập sai. | Tối đa gửi lại OTP 3 lần (lần 4 phải báo OTP-03); mỗi lần gửi lại phải reset số lần nhập sai về 0. | Bấm "Gửi lại mã OTP" 4 lần liên tiếp → Lần thứ 4 vẫn cấp mã thành công. | Bonus B7 / BR-104 |
| **D13** | Mã trạng thái HTTP phản hồi | Lỗi `EKYC-01` (Giấy tờ hết hạn) trả về **HTTP 200 OK** (thân JSON báo lỗi). | Lỗi nghiệp vụ do người dùng gửi giấy tờ sai/hết hạn phải trả về **HTTP 400 Bad Request**. | Kiểm tra tab DevTools Network khi chọn Persona **P09** (hết hạn) → Thấy status code là 200 OK thay vì 400. | Bonus B11 (Chuẩn RESTful API) |

---

## 4. Hướng dẫn Đánh giá & Chấm Điểm Bài Tập Về Nhà

**Yêu cầu đối với học viên:** Thực thi tối thiểu 12 Test Scenario và ghi chép Review Log (Expected vs Actual, Pass/Fail, Link BR).

**Thang điểm gợi ý cho Giảng viên:**
- **Tìm được 6 – 8 lỗi:** Đạt yêu cầu tốt (Nắm chắc kỹ thuật kiểm thử biên BVA, phân vùng tương đương trên UI).
- **Tìm được 9 – 11 lỗi:** Xuất sắc (Biết cách kiểm tra tab Network trong DevTools hoặc dùng Postman kiểm tra API).
- **Tìm được đủ 12 – 13 lỗi:** Cực kỳ xuất sắc (Phát hiện được các lỗi bảo mật API D04, D07, D10 và lỗi tính toán ngày tháng đặc biệt).
