# HƯỚNG DẪN TỪNG BƯỚC — Build bằng Antigravity & Deploy lên Vercel + Neon
### Dự án: NeoBank eKYC (ứng dụng giả lập cho Buổi 1 – Banking Tester 1-1)

> **Tài liệu đi kèm (bắt buộc):**
> 1. `PLAN_NeoBank_eKYC_Buoi1_NextJS_Vercel_Neon.md` — đặc tả kỹ thuật cho agent
> 2. `Mini-SRS_Buoi_1_Mo_Tai_Khoan_eKYC_v2.1.pdf`
> 3. `Hinh_3.1_Business_Flow_eKYC.png`
>
> **Cách đọc:** phần **🧑 BẠN LÀM** là thao tác của bạn; phần **🤖 PROMPT** là đoạn copy nguyên văn dán vào Antigravity. Làm đúng thứ tự, mỗi giai đoạn chỉ chuyển tiếp khi đã đạt mục "✅ Kiểm tra".

---

## Tổng quan lộ trình

| Bước | Ai làm | Nội dung | Thời gian ước tính |
|---|---|---|---|
| A | Bạn | Chuẩn bị tài khoản, công cụ, repo GitHub | 20 phút |
| B0–B1 | Antigravity | Đọc tài liệu, dựng khung dự án (P0) | 30–45 phút |
| C | Bạn | Tạo project Vercel, kết nối Neon + Blob, biến môi trường, kéo env về máy | 30 phút |
| B2–B7 | Antigravity | Database, API, giao diện, trainer, 13 lỗi cài sẵn, tài liệu (P1–P6) | 1–2 ngày (tùy agent) |
| D | Bạn | Deploy production, nghiệm thu, chuẩn bị cho học viên | 30 phút |

---

## PHẦN A — Chuẩn bị (🧑 BẠN LÀM)

**A1. Tài khoản**
- GitHub (repo **private**).
- Vercel (đăng nhập bằng GitHub). Lưu ý: khóa học có thu phí → nên dùng gói **Pro**; gói Hobby chỉ cho mục đích cá nhân, phi thương mại.
- Neon: **không cần** tạo riêng — sẽ tạo từ Vercel Marketplace ở Phần C.

**A2. Công cụ trên máy**
```bash
node -v          # cần v20 trở lên
npm -v
git --version
npm i -g vercel  # Vercel CLI
vercel login
```

**A3. Tạo repo và đưa tài liệu vào**
1. Trên GitHub tạo repo private `neobank-ekyc` (không tạo README).
2. Clone về máy, mở thư mục bằng Antigravity.
3. Tạo thư mục `docs/` và chép 3 file tài liệu vào:
```
neobank-ekyc/
  docs/PLAN.md                         ← đổi tên từ PLAN_NeoBank_eKYC_Buoi1_NextJS_Vercel_Neon.md
  docs/Mini-SRS_Buoi_1_v2.1.pdf
  docs/Hinh_3.1_Business_Flow_eKYC.png
```
4. Commit & push: `git add . && git commit -m "docs: add plan and SRS" && git push`.

---

## PHẦN B — Build với Antigravity

### Quy tắc chung (dán MỘT LẦN ở đầu cuộc hội thoại với agent)

🤖 **PROMPT — Quy tắc làm việc**
```text
You are the developer of this repository. The full specification is docs/PLAN.md
(business source of truth: docs/Mini-SRS_Buoi_1_v2.1.pdf and docs/Hinh_3.1_Business_Flow_eKYC.png).

Working rules for the whole project:
1. Work ONLY on the phase I give you. Do not start the next phase.
2. Follow docs/PLAN.md exactly, especially Section 0 (rules), Section 8 (behaviour profiles)
   and Section 15 (Vercel + Neon rules). If something is unclear, write the decision in
   docs/IMPLEMENTATION_NOTES.md and continue; ask me only if it blocks the phase.
3. Never put the words bug, defect, fault, seeded, intentional in src code, UI text,
   commit messages or student docs. Profile-dependent behaviour lives only in lib/core/policy.ts.
4. Never commit secrets. .env* files must be git-ignored.
5. At the end of each phase: run `npm run lint`, `npm run typecheck`, `npm test` (when tests exist)
   and `npm run build`; fix all errors; commit with message "phase <id>: <summary>"; push;
   then report: what was done, files created, command results, open questions.
```

---

### B0 — Đọc hiểu tài liệu (chưa viết code)

🤖 **PROMPT B0**
```text
Phase B0 (no code). Read docs/PLAN.md, the SRS PDF and the flow diagram.
Reply with:
1. A 10-line summary of the app and its two profiles (training / reference).
2. The final folder tree you will create (Next.js App Router).
3. A table mapping every SRS item (B1–B6, 3A, 4A, 6A, BR-101..105, EKYC-01/02/03/99)
   to the endpoint/screen that implements it.
4. Any contradiction or missing information you see in the plan, with your proposed decision.
Do not create files yet.
```
✅ **Kiểm tra:** bảng ánh xạ có đủ mọi mã SRS; agent hiểu đúng Mục 15 (Neon, Blob, giới hạn 4.5 MB). Nếu agent đề xuất thay đổi lớn (đổi DB, bỏ sandbox…) → trả lời "Keep the plan as written".

---

### B1 — P0: Dựng khung dự án

🤖 **PROMPT B1 (Phase P0)**
```text
Phase P0 – Scaffold. Implement:
- Next.js 15 App Router + TypeScript (strict), ESLint, Prettier, Vitest, Playwright installed.
- Folder layout exactly as docs/PLAN.md Section 3.
- lib/config.ts: read and validate env vars with zod (Section 15.2). In this phase DB/Blob
  variables are OPTIONAL so the app builds without them; mark them required from P1.
- lib/clock.ts (simulated date helper), lib/core/policy.ts (empty profile switch skeleton,
  neutral function names), lib/sandbox.ts (stub).
- app/api/dev/health/route.ts → { status: "ok", today, version } (never expose the profile).
- A placeholder home page "NeoBank – Mở tài khoản" (Vietnamese).
- package.json scripts: dev, build, start, lint, typecheck, test, test:e2e,
  and "vercel-build": "next build" (will be extended in P1).
- .gitignore covering .env*, .vercel, node_modules; .env.example listing all variables
  of Section 15.2 with empty values.
- next.config: productionBrowserSourceMaps false.
Then run the checks, commit "phase P0: scaffold", push, and report.
```
✅ **Kiểm tra (bạn tự chạy):**
```bash
npm install
npm run build
npm run dev   # mở http://localhost:3000/api/dev/health → {"status":"ok",...}
```

➡️ **Dừng lại, chuyển sang PHẦN C** để có database và biến môi trường trước khi làm P1.

---

## PHẦN C — Tạo hạ tầng trên Vercel (🧑 BẠN LÀM)

**C1. Import project vào Vercel**
1. Vercel Dashboard → **Add New… → Project** → chọn repo `neobank-ekyc` → **Import**.
2. Framework: Next.js (tự nhận). Giữ mặc định → **Deploy**.
3. Mở URL được cấp, thêm `/api/dev/health` → phải thấy `{"status":"ok"}`.

**C2. Chọn region gần Việt Nam**
- Project → **Settings → Functions → Function Region** → chọn **Singapore (sin1)** → Save.
  (Database ở bước C3 cũng chọn Singapore để giảm độ trễ.)

**C3. Thêm Neon Postgres (qua Marketplace)**
1. Project → tab **Storage** → **Create Database / Connect Store** → chọn **Neon** (hoặc mở Vercel Marketplace → Neon → Install).
2. Chọn region **AWS Singapore (ap-southeast-1)**, đặt tên `neobank-ekyc-db`.
3. Phần **Environments**: tick **Development, Preview, Production**.
4. Tùy chọn tạo database branch riêng cho mỗi Preview Deployment: có thể **bật** (an toàn khi thử thay đổi) hoặc **tắt** cho đơn giản — cả hai đều chạy được vì migration chạy lúc build.
5. Hoàn tất. Vào **Settings → Environment Variables**, kiểm tra đã có `DATABASE_URL` và `DATABASE_URL_UNPOOLED`.

**C4. Thêm Vercel Blob (lưu ảnh tải lên)**
1. Project → **Storage** → **Create** → **Blob** → tên `neobank-ekyc-images`, access **Public**.
2. Tick **"Add a read-write token env var to this connection"**, chọn cả **Development, Preview, Production**.
3. Kiểm tra trong Environment Variables đã có `BLOB_READ_WRITE_TOKEN`.

**C5. Thêm biến môi trường tự đặt**
Project → **Settings → Environment Variables** → thêm cho cả 3 môi trường:

| Name | Giá trị | Cách tạo |
|---|---|---|
| `SESSION_SECRET` | chuỗi ngẫu nhiên ≥ 32 ký tự | `openssl rand -base64 48` |
| `TRAINER_PIN` | mã PIN của bạn (6–8 số) | tự đặt, không chia sẻ |
| `READONLY_DB_PASSWORD` | chuỗi ngẫu nhiên ≥ 32 ký tự, chỉ chữ + số | `openssl rand -hex 24` |
| `DEFAULT_PROFILE` | `training` | |
| `DEFAULT_TODAY` | `2026-11-23` | đổi theo ngày dạy nếu muốn |

**C6. Đổi Build Command**
Project → **Settings → Build & Deployment** (hoặc *General → Build & Development Settings*) → **Build Command** → Override = `npm run vercel-build` → Save.

**C7. Kéo biến môi trường về máy để agent dùng khi code**
```bash
cd neobank-ekyc
vercel link            # chọn đúng team & project
vercel env pull .env.local
```
Mở `.env.local` kiểm tra có `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BLOB_READ_WRITE_TOKEN`, `SESSION_SECRET`… (file này KHÔNG được commit).

> ⚠️ Mỗi lần thay đổi Environment Variables trên Vercel: chạy lại `vercel env pull .env.local` cho máy, và **Redeploy** để production nhận giá trị mới.

---

## PHẦN B (tiếp) — Build các giai đoạn còn lại

### B2 — P1a: Database, migration, sandbox

🤖 **PROMPT B2 (Phase P1a – Database)**
```text
Phase P1a – Database layer. .env.local now contains DATABASE_URL, DATABASE_URL_UNPOOLED,
BLOB_READ_WRITE_TOKEN and the other variables. Implement (docs/PLAN.md Sections 7, 15.2, 15.3, 15.5):
- Drizzle ORM with @neondatabase/serverless (neon-http) in lib/db.ts using DATABASE_URL.
- db/schema.ts: sandboxes, settings, customers, accounts, onboarding_sessions, phone_locks,
  sms_outbox, api_logs (sandbox_id on every table, Postgres types as in Section 7,
  NO unique constraint on customers.id_number).
- drizzle.config.ts using DATABASE_URL_UNPOOLED; scripts db:generate, db:migrate.
- db/post-migrate.ts (idempotent, run with tsx):
  a) create/alter role ekyc_readonly LOGIN with password from READONLY_DB_PASSWORD;
  b) create schema learner and the 5 views filtered by current_setting('app.sandbox_id', true);
  c) grant USAGE on learner + SELECT on the views only;
  d) create sandbox DEMO01 with DEFAULT_PROFILE / DEFAULT_TODAY if missing and seed it.
- db/seed.ts: seedSandbox(sandboxId) → 3 existing customers (one owns phone 0911111111,
  one owns CCCD 001090000003), each with 1 ACTIVE account and a balance.
- lib/sandbox.ts: resolve sandbox from cookie "sbx", header "X-Sandbox-Id", default DEMO01.
- lib/settings.ts: get/set profile, today, network toggles per sandbox.
- package.json "vercel-build": "drizzle-kit migrate && tsx db/post-migrate.ts && next build".
- Vitest tests for seedSandbox and settings (run against the dev database).
Run migrations on the development database, run checks, commit "phase P1a: database", push, report.
```
✅ **Kiểm tra:** Neon Console → project → **Tables** thấy đủ bảng; bảng `sandboxes` có `DEMO01`; `customers` có 3 dòng với `sandbox_id = DEMO01`. Vercel tự deploy lại sau khi push → build phải **thành công** (đã chạy migrate trên production DB).

---

### B3 — P1b: API theo hành vi chuẩn (reference)

🤖 **PROMPT B3 (Phase P1b – API)**
```text
Phase P1b – API with REFERENCE behaviour only (docs/PLAN.md Sections 4, 6, 15.6, 15.7).
- Endpoints 1–7 of Section 6.1 under app/api/v1 (Node.js runtime), including
  upload-token (Vercel Blob handleUpload with JWT check in onBeforeGenerateToken,
  image/jpeg+png, max 6 MB, pathname ekyc/{sandboxId}/).
- OCR and face-check take image URLs; allow only own origin /samples/* and
  *.public.blob.vercel-storage.com; read size with HEAD Content-Length.
  Persona and score are resolved from the file name (Section 9).
- Error model of Section 6.2/6.3, X-Request-Id header, api_logs for every call
  (mask password; never log OTP outside sms_outbox).
- JWT onboarding token (jose, 30 min), sandbox resolution, simulated clock for age/expiry.
- /api/dev/sms and /api/dev/health.
- public/openapi.yaml describing exactly what is implemented (including the extra submit
  fields email, address, password, onboardingId) and page /docs with Swagger UI.
- Vitest API tests for every rule in Section 4 with APP behaviour = reference
  (force profile "reference" on a test sandbox).
Use placeholder sample files if P2 assets do not exist yet. Run checks, commit "phase P1b: api", push, report.
```
✅ **Kiểm tra:** mở `https://<app>.vercel.app/docs` thấy Swagger; `npm test` xanh; trong báo cáo của agent có danh sách test theo từng BR.

---

### B4 — P2: Ảnh mẫu, upload và giao diện học viên

🤖 **PROMPT B4 (Phase P2 – UI)**
```text
Phase P2 – Sample assets and student UI (docs/PLAN.md Sections 5, 9, 15.6).
- scripts/gen-samples.ts (sharp): persona front/back images P01–P09 (fictional card design,
  watermark "MẪU – KHÔNG CÓ GIÁ TRỊ"), 6 selfie samples, and size files 99KB, 100KB, 101KB,
  5MB (5 242 880 bytes), 5_1MB with EXACT byte sizes. Commit the generated files in public/samples/.
- Screens S00–S09 in Vietnamese, mobile phone frame 390 px, footer
  "Môi trường: SIT • Ngày hệ thống: dd/MM/yyyy".
- S03 and S05: "Chọn ảnh mẫu" gallery (labels "Mẫu 1…", no scores shown) and
  "Tải ảnh lên" using @vercel/blob/client upload() with handleUploadUrl.
- SMS inbox drawer on S02 reading /api/dev/sms.
- All calls go through the public API so they are visible in DevTools → Network.
- Playwright: happy path P01 end-to-end; P09 shows EKYC-01; 3A address edit is saved.
Run checks, commit "phase P2: ui", push, report with screenshots of S00–S08.
```
✅ **Kiểm tra (trên URL Vercel):** đi hết luồng với ảnh mẫu P01 + selfie "Mẫu 1" → màn hình Chúc mừng có số CIF và số tài khoản; mở DevTools → Network thấy `POST /api/v1/onboarding/ekyc-submit`.

---

### B5 — P3: Trainer panel, công cụ giả lập, trang SQL

🤖 **PROMPT B5 (Phase P3 – Trainer & simulators)**
```text
Phase P3 – Trainer and simulators (docs/PLAN.md Sections 6.4, 6.5, 15.3, 15.5, 15.7).
- /trainer page: PIN login (httpOnly signed cookie 8h); create/list sandboxes (name + 6-char code,
  copyable link https://<host>/?s=CODE); per sandbox: reset + reseed, profile switch,
  simulated date, network toggles (dropAfterCoreCommit, coreDown), table viewer, last 100 API logs.
- /?s=CODE sets cookie "sbx"; Postman can use header X-Sandbox-Id.
- Trainer APIs under /api/trainer/* (cookie or X-Trainer-Pin).
- /sql page + POST /api/v1/sql/query using role ekyc_readonly exactly as Section 15.5
  (single SELECT, denylist, statement_timeout 3s, max 200 rows, learner schema only).
- Tests: sandbox isolation (two sandboxes do not see each other's data), SQL denylist,
  trainer endpoints reject wrong PIN.
Run checks, commit "phase P3: trainer", push, report.
```
✅ **Kiểm tra:** vào `/trainer` → tạo sandbox `HV01` → mở link trong cửa sổ ẩn danh → làm luồng P01 → quay lại trainer thấy dữ liệu chỉ trong `HV01`; trang `/sql` chạy được `SELECT * FROM customers` và bị chặn với `DELETE FROM customers`.

---

### B6 — P4: Hành vi profile training (13 lỗi cài sẵn)

🤖 **PROMPT B6 (Phase P4 – Training profile)**
```text
Phase P4 – Implement Section 8 items D01–D13 for profile "training" ONLY, all through
lib/core/policy.ts with neutral names. Reference profile must stay exactly as in P1b.
- For each item add one Vitest test that asserts the training behaviour and one that
  asserts the reference behaviour (same input, different sandbox profile).
- D06 uses the sandbox network toggle dropAfterCoreCommit.
- D11 and the phone-prefix UI check of D10 are client-side; keep the code neutral.
- Run: grep -riE "bug|defect|fault|seeded|intentional" app lib components → must return nothing.
- Write trainer/TRAINER_GUIDE.md with the D01–D13 catalog and exact reproduction steps
  (UI and Postman) — this file must not be served by the app.
Run checks, commit "phase P4: training profile", push, report the test matrix (13 x 2).
```
✅ **Kiểm tra:** báo cáo có bảng 13 × 2 đều PASS. Tự thử nhanh 2 lỗi: sandbox `training` + selfie điểm 80 → tạo tài khoản được (D01); đổi sang `reference` → bị từ chối EKYC-02.

---

### B7 — P5 + P6: Tài liệu, Postman, nghiệm thu

🤖 **PROMPT B7 (Phase P5–P6 – Docs & verification)**
```text
Phase P5–P6 – Documentation and verification (docs/PLAN.md Sections 10, 13, 14).
- README.md for students in Vietnamese: what the app is, link usage (?s=CODE), Swagger,
  Postman import, SQL page, persona sheet WITHOUT expected results, homework text (Section 14).
- postman/: collection with folders B1–B6 + Customers + SQL, environment with
  baseUrl, sandboxId, onboardingId, token (auto-set by test scripts).
- docs/IMPLEMENTATION_NOTES.md complete; docs/VERIFICATION.md with Section 13 checklist ticked
  and evidence (command output, URLs).
- Security headers (X-Content-Type-Options, Referrer-Policy, frame-ancestors none),
  no source maps, no /trainer link anywhere in student UI.
- Playwright smoke suite runnable against production: BASE_URL=https://<app>.vercel.app npm run test:e2e
Run checks, commit "phase P5-P6: docs and verification", push, report.
```

---

## PHẦN D — Deploy production & nghiệm thu (🧑 BẠN LÀM)

**D1. Deploy**
- Mỗi lần agent `git push` lên nhánh `main`, Vercel tự build production (build đã gồm migrate). Theo dõi tại **Deployments**; trạng thái phải là **Ready**.
- Nếu vừa đổi Environment Variables: **Deployments → (deployment mới nhất) → … → Redeploy**.

**D2. Nghiệm thu trên URL production**

| # | Việc kiểm tra | Kết quả mong đợi |
|---|---|---|
| 1 | `/api/dev/health` | `status: ok`, không hiện profile |
| 2 | `/docs` | Swagger hiển thị đủ endpoint |
| 3 | Luồng P01 với "Mẫu 1" | Màn hình Chúc mừng, có CIF + số TK |
| 4 | Persona P09 | Báo "Giấy tờ không hợp lệ hoặc đã hết hạn" |
| 5 | Trainer → đổi ngày hệ thống sang hôm sau | P04 được/không được mở TK thay đổi tương ứng |
| 6 | Tải ảnh 5_1MB bằng nút "Tải ảnh lên" | Không lỗi 413; ứng dụng tự xử lý theo BR-102 |
| 7 | `/sql`: `SELECT * FROM customers` | Chỉ thấy dữ liệu sandbox hiện tại, không có password |
| 8 | `npm run test:e2e` với BASE_URL production | Tất cả xanh |
| 9 | View source / DevTools → Sources | Không thấy `policy.ts`, không có source map |

**D3. Chuẩn bị trước buổi học**
1. `/trainer` → tạo sandbox cho học viên (VD `HV-NGUYEN`), profile **training**, ngày hệ thống = ngày học.
2. Gửi học viên: link `https://<app>.vercel.app/?s=<CODE>`, file Postman collection + environment (điền `baseUrl`, `sandboxId`), README.
3. **Không** gửi repo GitHub và `TRAINER_GUIDE.md`.
4. Sau buổi: xem `api_logs` của sandbox trong trainer panel để biết học viên đã thử những gì.

---

## PHẦN E — Xử lý sự cố thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Build lỗi ở bước `drizzle-kit migrate` | Thiếu `DATABASE_URL_UNPOOLED` ở môi trường đang build (thường là Preview) | Settings → Environment Variables: kiểm tra biến Neon có tick đủ Preview/Production; Redeploy |
| Build lỗi ở `post-migrate` khi tạo role | Mật khẩu `READONLY_DB_PASSWORD` quá ngắn/yếu hoặc thiếu biến | Dùng `openssl rand -hex 24`, thêm vào cả 3 môi trường, Redeploy |
| Upload ảnh lỗi 413 | Code gửi file qua API thay vì upload thẳng lên Blob | Yêu cầu agent: "Fix per PLAN Section 15.6 – use @vercel/blob/client upload()" |
| Upload lỗi token/unauthorized | Thiếu `BLOB_READ_WRITE_TOKEN` (chưa tick "Add a read-write token env var") | Storage → Blob store → Projects → cập nhật kết nối, tick token; Redeploy; `vercel env pull` lại |
| Đổi biến môi trường nhưng app không đổi | Biến chỉ áp dụng cho deployment mới | Redeploy |
| App chậm khi gọi DB | Function region khác region DB | Settings → Functions → Region = Singapore (sin1), DB ở ap-southeast-1 |
| Chạy local báo thiếu biến | Chưa kéo env | `vercel env pull .env.local` |
| Agent làm lố sang giai đoạn sau / đổi kiến trúc | Prompt chưa đủ ràng buộc | Nhắc: "Stop. Revert changes outside phase <id>. Follow docs/PLAN.md as written." |

---

## Phụ lục — Prompt sửa lỗi nhanh cho Antigravity

```text
The following check failed: <dán kết quả lỗi / mô tả>.
Find the root cause, fix it within the current phase only, add or update a test that
would have caught it, run lint/typecheck/test/build, commit "fix: <summary>", push and report.
```
