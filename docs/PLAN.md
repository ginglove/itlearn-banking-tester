# BUILD PLAN — NeoBank eKYC Onboarding (Dummy App for Banking Tester Course, Session 1)
## Target: Next.js (App Router) on Vercel + Neon Postgres + Vercel Blob

> **How to use this file:** give this whole file to the Antigravity agent together with
> `Mini-SRS_Buoi_1_Mo_Tai_Khoan_eKYC_v2.1.pdf` and `Hinh_3.1_Business_Flow_eKYC.png`.
> Work phase by phase (Section 12). After each phase, run the checks in Section 13 and report the results before moving on.

---

## 0. Instructions for the agent (read first)

1. You are building a **training app**, not a real bank. Its purpose is to let students **test** it. The app MUST contain the **intentional defects** in Section 8, and they must be **deterministic** (reproducible every time with the same input).
2. The **source of truth** for business behaviour is the Mini-SRS v2.1 (SRS-NB-001). Codes `B1…B6`, `3A`, `4A`, `6A`, `BR-101…BR-105` and `EKYC-01/02/03/99` must appear exactly as in the SRS (in logs, error responses, OpenAPI doc).
3. **Do not leak the defects to students:**
   - No code comments, variable names, commit messages, UI text or student docs may contain words like "bug", "defect", "seeded", "fault", "intentional".
   - All defect behaviour lives in ONE module (`lib/core/policy.ts`) driven by the per-sandbox setting `profile = "training" | "reference"` (default from env `DEFAULT_PROFILE`). Use neutral names (e.g. `faceThreshold()`, `ageCalcMode()`).
   - The defect catalog goes ONLY in `trainer/TRAINER_GUIDE.md`, which is excluded from the student build/image.
4. Target platform is **Next.js on Vercel** (serverless). Read Section 15 before writing code: no local files at runtime, no in-memory state, request body ≤ 4.5 MB. Local dev must also work with `npm run dev`. No real OCR/AI, no real SMS, no real personal data.
5. UI language: **Vietnamese** (with diacritics). Code, API field names, identifiers: **English**.
6. When the SRS is silent, implement the behaviour written in this plan and note it in `docs/IMPLEMENTATION_NOTES.md`. When the SRS is silent **and** this plan is silent, choose the simplest behaviour and log it in the same file. Never ask the student to read this file.

---

## 1. Purpose & how the trainer uses it

| Moment | Use |
|---|---|
| Session 1, Part 2D (API) | Trainer demos the real app and opens Chrome DevTools → Network to show the real `POST /ekyc-submit` request. |
| Session 1 homework | Student executes their ≥ 12 Test Scenarios against the app, logs findings (expected vs actual) and links each finding to an SRS item. |
| Session 2 (preview) | The same API is reused in Postman (GET/POST); the DB is reused for SQL practice through the read-only SQL page `/sql` (Section 15.5). |
| Mid/End assessment | Trainer switches profile, resets DB, gives a new persona set. |

**Learning outcome:** students experience that defects found on paper in Session 1 (SRS review) really appear in software, and learn to test both **UI** and **API**, with **boundary values** and **negative data**.

---

## 2. Scope

**In scope**
- Mobile-first web app (phone frame, 390 px wide) for the full onboarding flow B1→B6 and flows 3A, 4A, 6A.
- REST API exactly following SRS Section 5, plus helper endpoints needed by the UI (Section 6).
- Simulators: SMS inbox, OCR, Liveness/Face Matching, Core Banking (Neon Postgres), network drop, "today" date.
- Trainer panel (`/trainer`, PIN protected): reset DB, switch profile, set simulated date, simulate network drop, view tables, view request log.
- Swagger UI (`/docs`), Postman collection + environment, seed data, sample images, student README, trainer guide.
- Automated tests proving each defect exists in `training` and is absent in `reference`.

**Out of scope**
- Real OCR, real biometrics, NFC reading, real SMS/email, login after onboarding (only a stub screen), forgot-password flow (stub screen), payments.
- Production security hardening (but do not add vulnerabilities other than those in Section 8).

---

## 3. Tech stack (Next.js + Vercel)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | UI pages + API Route Handlers in one project, deploys natively on Vercel |
| API | Route Handlers `app/api/v1/**/route.ts` (Node.js runtime, not Edge), `zod` validation | |
| DB | **Neon Postgres** via `@neondatabase/serverless` (HTTP driver) + **Drizzle ORM**; migrations with `drizzle-kit` using `DATABASE_URL_UNPOOLED` | Native Vercel Marketplace integration; Vercel has no writable disk |
| File storage | **Vercel Blob** (client uploads) for user-uploaded images; sample images served from `public/samples/` | Avoids the 4.5 MB function body limit (Section 15) |
| State | Everything persisted in DB (sessions, OTP, locks, settings, logs). No module-level variables for state | Serverless instances are not shared |
| UI | React Server/Client Components, plain CSS modules | |
| API docs | `public/openapi.yaml` + page `/docs` (swagger-ui-react) | |
| Tests | Vitest (route handlers via `next-test-api-route-handler` or direct handler calls), Playwright | |
| Deploy | Vercel project, env vars in Section 15; local: `npm install && npm run db:reset && npm run dev` | |

Repo layout:
```
neobank-ekyc/
  app/
    (student)/page.tsx, onboarding/[step]/page.tsx   # screens S00–S09
    trainer/page.tsx                                 # trainer panel (PIN)
    docs/page.tsx                                    # Swagger UI
    api/v1/onboarding/{otp/request,otp/resend,otp/verify,upload-token,ocr,face-check,ekyc-submit}/route.ts
    api/v1/customers/[cif]/route.ts
    api/dev/{sms,health}/route.ts
    api/trainer/{reset,profile,clock,network,tables/[name],logs,sandboxes}/route.ts
  lib/
    config.ts  db.ts (Drizzle + neon-http)  clock.ts  sandbox.ts  auth.ts (JWT via jose)
    core/policy.ts          # ALL behaviour switches (training vs reference)
    modules/otp ocr face submit
  db/schema.ts (Drizzle)  db/migrations/  db/seed.ts  db/sql/readonly.sql (role + views)
  public/samples/ (persona images, selfies, size/)  public/openapi.yaml
  postman/  tests/  docs/IMPLEMENTATION_NOTES.md
  trainer/TRAINER_GUIDE.md  # keep in a PRIVATE repo; never linked from the app
  README.md
```

## 4. Business rules to implement (from SRS v2.1)

| ID | Rule (reference behaviour) |
|---|---|
| B1 | Phone: 10 digits, prefix 03/05/07/08/09. Email: valid format, **optional** (SRS silent → optional; log in notes). |
| B2 | Phone must not exist → else `EKYC-03`/409. OTP 6 digits, valid 60 s, sent to fake SMS inbox. |
| BR-104 | Resend OTP max 3 times per session. Wrong OTP: after the **5th** wrong attempt the phone is locked 24 h (the 6th attempt and later get "locked"). |
| B3 / BR-102 | Front + back images, each 100 KB ≤ size ≤ 5 MB, JPG/PNG. OCR returns idNumber, fullName, dob, expiryDate, address. CCCD expired (expiryDate ≤ today) → `EKYC-01`/400. |
| 3A | Only `address` is editable. `idNumber`, `fullName`, `dob` are locked; if wrong, user must re-capture. |
| B4 / BR-103 | Liveness must pass AND faceMatchScore ≥ 85.0 to continue. |
| 4A | Fail → may retry; after **3** failures the eKYC session is locked 30 minutes (server-side). |
| BR-101 | Age ≥ 18 calculated from full date of birth vs simulated today (birthday today = 18 → allowed). Under 18 → reject (reference uses code `EKYC-04`, see Section 6.3). |
| B5 | Confirm data, choose free random account number, accept T&C, create password. Reference password policy (SRS silent → plan decides): 8–20 chars, ≥ 1 upper, ≥ 1 lower, ≥ 1 digit, not containing phone number or DOB (ddMMyyyy). |
| B6 / BR-105 | Core checks idNumber; if CIF exists → `EKYC-05`/409 "Bạn đã có tài khoản" → UI goes to "Quên mật khẩu" stub. Else create CIF (8 digits) + CASA account (13 digits) status ACTIVE. |
| 6A | If the connection drops after Core created the CIF, a retry with the same `onboardingId` must complete the same profile (idempotent) — no second CIF, no duplicate error. |
| EKYC-99 | Core unavailable (simulated) → 500 "Hệ thống đang bận, vui lòng thử lại sau". |

> `EKYC-04` and `EKYC-05` do **not** exist in the SRS (that is one of the SRS gaps). They exist only in `reference` profile. In `training` profile behave as in Section 8.

---

## 5. Screens (student UI, Vietnamese)

| ID | Screen | Key elements |
|---|---|---|
| S00 | Chào mừng | Logo NeoBank (fictional), button "Mở tài khoản mới" |
| S01 | Số điện thoại & Email (B1) | Inputs, inline validation, button "Gửi mã OTP" |
| S02 | Nhập OTP (B2) | 6 boxes, 60 s countdown, "Gửi lại mã" (shows remaining resends), **"Hộp thư SMS (giả lập)"** drawer showing received OTPs |
| S03 | Chụp CCCD (B3) | Upload front/back **or** "Chọn ảnh mẫu" gallery (Section 9) — gallery is the normal path for students |
| S04 | Xác nhận thông tin OCR (3A) | Fields; only Địa chỉ editable; others greyed with lock icon; button "Chụp lại CCCD" |
| S05 | Xác thực khuôn mặt (B4) | "Quay video" simulated by choosing a selfie sample; shows remaining attempts; lock screen with countdown (4A) |
| S06 | Hoàn tất thông tin (B5) | Summary, package "Số ngẫu nhiên – Miễn phí", T&C checkbox + link, password + confirm password |
| S07 | Chúc mừng (B6) | CIF number, account number, status ACTIVE, button "Đăng nhập" (stub) |
| S08 | Đã có tài khoản | Message + "Quên mật khẩu" stub |
| S09 | Error / Locked states | Generic error banner showing `responseCode` + message |

UI rules: all API calls visible in DevTools; show a small footer "Môi trường: SIT • Ngày hệ thống: dd/MM/yyyy" (simulated date) so students know the date used for age/expiry.

---

## 6. API specification

Base URL `http://localhost:3000/api/v1`. JSON UTF-8. Every response includes header `X-Request-Id`.

### 6.1 Endpoints
| # | Method & Path | Step | Request | Success |
|---|---|---|---|---|
| 1 | `POST /onboarding/otp/request` | B1–B2 | `{ phoneNumber, email? }` | 200 `{ onboardingId, otpExpiresIn: 60, resendRemaining }` |
| 2 | `POST /onboarding/otp/resend` | BR-104 | `{ onboardingId }` | 200 `{ otpExpiresIn: 60, resendRemaining }` |
| 3 | `POST /onboarding/otp/verify` | B2 | `{ onboardingId, otp }` | 200 `{ onboardingToken }` (Bearer, 30 min) |
| 4a | `POST /onboarding/upload-token` | B3 | Bearer; Vercel Blob `handleUpload` protocol (used by the UI only) | 200 client token |
| 4 | `POST /onboarding/ocr` (JSON) | B3 | Bearer + `{ frontImageUrl, backImageUrl }` — URLs from Vercel Blob or `/samples/...` | 200 `{ idNumber, fullName, dob, expiryDate, address }` |
| 5 | `POST /onboarding/face-check` (JSON `{ selfieUrl }`) | B4 | Bearer | 200 `{ livenessPassed, faceMatchScore, attemptsRemaining, passed }` |
| 6 | `POST /onboarding/ekyc-submit` | B6 | Bearer + **exact SRS body** `{ phoneNumber, idNumber, fullName, dob, expiryDate, faceMatchScore }` + extra fields `{ email, address, password, onboardingId }` | 200 **exact SRS response** `{ responseCode:"00", message:"Khoi tao tai khoan thanh cong", data:{ cifNumber, accountNumber, status:"ACTIVE" } }` |
| 7 | `GET /customers/{cifNumber}` | (for Session 2 GET practice) | Bearer | 200 customer + accounts |

Extra submit fields (email, address, password, onboardingId) are **not in the SRS** — document them in `openapi.yaml` exactly as implemented. Students should notice the SRS-vs-API gap.

### 6.2 Error body (all errors)
```json
{ "responseCode": "EKYC-02", "message": "Xác thực khuôn mặt không thành công", "requestId": "..." }
```

### 6.3 Error codes
| Code | HTTP | Message (UI) | Source |
|---|---|---|---|
| EKYC-01 | 400 | Giấy tờ không hợp lệ hoặc đã hết hạn | SRS |
| EKYC-02 | 400 | Xác thực khuôn mặt không thành công | SRS |
| EKYC-03 | 409 | Số điện thoại đã được đăng ký trên hệ thống | SRS |
| EKYC-99 | 500 | Hệ thống đang bận, vui lòng thử lại sau | SRS |
| VAL-400 | 400 | Dữ liệu không hợp lệ (field-level details array) | plan |
| OTP-01 | 400 | Mã OTP không đúng hoặc đã hết hạn | plan |
| OTP-02 | 429 | Số điện thoại tạm khóa 24 giờ | plan |
| OTP-03 | 429 | Đã vượt số lần gửi lại mã | plan |
| SES-01 | 423 | Phiên eKYC tạm khóa 30 phút | plan |
| AUTH-401 | 401 | Phiên làm việc không hợp lệ hoặc đã hết hạn | plan |
| EKYC-04 | 400 | Khách hàng chưa đủ 18 tuổi | reference only |
| EKYC-05 | 409 | Bạn đã có tài khoản tại NeoBank | reference only |

### 6.4 Dev/simulator endpoints (`/api/dev/*`, always on, students may use)
- `GET /api/dev/sms?phone=09xxxxxxxx` → fake SMS inbox (latest first).
- `GET /api/dev/health` → `{ status, profile:"hidden", today }` (never reveal profile to students).

### 6.5 Trainer endpoints (`/api/trainer/*`, header `X-Trainer-Pin`)
- `POST reset` (re-seed DB) • `PUT profile {training|reference}` • `PUT clock {today:"2026-11-22"}` • `PUT network {dropAfterCoreCommit:true|false, coreDown:true|false}` • `GET tables/{name}` • `GET logs?limit=100`.

---

## 7. Data model (Postgres / Neon)

```sql
customers(cif_number TEXT PK, id_number TEXT, full_name TEXT, dob TEXT, expiry_date TEXT,
          phone_number TEXT, email TEXT, address TEXT, password_hash TEXT, created_at TEXT)
accounts(account_number TEXT PK, cif_number TEXT, product TEXT, status TEXT, balance INTEGER, opened_at TEXT)
onboarding_sessions(id TEXT PK, phone_number TEXT, email TEXT, status TEXT, otp_hash TEXT,
          otp_expires_at TEXT, otp_wrong_count INT, otp_resend_count INT, face_fail_count INT,
          locked_until TEXT, ocr_json TEXT, face_score REAL, cif_number TEXT, created_at TEXT)
phone_locks(phone_number TEXT PK, locked_until TEXT)
sms_outbox(id INTEGER PK, phone_number TEXT, content TEXT, sent_at TEXT)
api_logs(id INTEGER PK, request_id TEXT, method TEXT, path TEXT, status INT, request_json TEXT, response_json TEXT, at TEXT)
```
- Use Postgres types: `TEXT`, `DATE` for business dates, `TIMESTAMPTZ` for timestamps, `NUMERIC(5,1)` for face score, `BIGINT` for money (VND). Primary keys of customers/accounts are composite `(sandbox_id, cif_number)` / `(sandbox_id, account_number)`.
- Every table has a `sandbox_id TEXT NOT NULL` column; all queries filter by the current sandbox (Section 15.3). Add tables `sandboxes(id, code, name, created_at)` and `settings(sandbox_id, key, value)` for profile, simulated date, network toggles.
- `customers.id_number`: NO database UNIQUE constraint; uniqueness per sandbox is enforced in code **only in reference profile** — needed for defect D06.
- Seed: 3 existing customers (one owns phone `0911111111`, one owns CCCD `001090000003`), each with 1 ACTIVE account and a balance, for Session 2 reuse.
- All dates stored ISO `YYYY-MM-DD`; money as integer VND.

---

## 8. Intentional defects — `training` profile ONLY

> Implement each through `lib/core/policy.ts`. In `reference` profile every item behaves per Section 4.
> Each defect links to the SRS trap or bonus finding used in class, so homework connects to the Session 1 review.

| ID | Area | Training behaviour (actual) | Reference behaviour (expected) | How students find it | Links to |
|---|---|---|---|---|---|
| D01 | Face threshold | Passes when score ≥ **80.0** (uses EKYC-02 wording) | Pass only ≥ 85.0 | BVA with samples 79.9 / 80.0 / 84.9 / 85.0 | Trap 1: BR-103 vs EKYC-02 |
| D02 | Age | Age = current year − birth year (ignores day/month); no under-18 error, account created | Full DOB check, EKYC-04 | Persona P04 (turns 18 tomorrow) gets an account | Trap 2: BR-101 |
| D03 | Password | Any non-empty password accepted (e.g. `1`, phone number) | Policy in Section 4 | Negative tests on S06 | Trap 3: B5 |
| D04 | Trust client score | `ekyc-submit` ignores the session's face-check result and decides only on `faceMatchScore` from the request body | Uses server-side score stored in session; session not passed or body ≠ stored score → VAL-400 | Postman: send 99.0 after a failed face check | Bonus B1 (security) |
| D05 | Duplicate CCCD | Existing CIF → HTTP **500 EKYC-99** (generic) | 409 EKYC-05 + redirect S08 | Persona P06 | Bonus B2 / BR-105 |
| D06 | 6A retry | With `dropAfterCoreCommit` on, retry creates a **second CIF** for the same CCCD | Same onboardingId returns the first CIF | Trainer toggles network drop; check `customers` table | Bonus B3 / 6A |
| D07 | Locked fields via API | UI locks fullName/dob, but API accepts changed `fullName`/`dob` in submit and saves them | Must equal OCR values → VAL-400 | Postman edit body | 3A |
| D08 | Image size boundary | Exactly **100 KB** rejected; up to **5.5 MB** accepted | 100 KB–5 MB inclusive | BVA with files 99 KB / 100 KB / 5 MB / 5.1 MB in `assets/samples/size/` | Bonus B8 / BR-102 |
| D09 | Expiry date | CCCD expiring **today** accepted; CCCD "Không thời hạn" → 500 crash | expiry ≤ today → EKYC-01; "Không thời hạn" accepted | Personas P07, P08 | Bonus B6 |
| D10 | Phone prefix | API accepts any 10 digits (e.g. `0212345678`); only the UI checks prefix | API validates prefix → VAL-400 | API negative test | Mục 5 |
| D11 | 4A lock | 30-min lock stored only in browser; reload page → can retry | Lock enforced server-side (SES-01) | Fail 3 times, refresh | 4A |
| D12 | OTP resend | 4th resend still allowed; resend does not reset wrong-attempt counter | Max 3 resends (OTP-03) | Count resends | Bonus B7 / BR-104 |
| D13 | Error status | `EKYC-01` returned with **HTTP 200** (responseCode says error) | HTTP 400 | API test checks status code | Bonus B11 |

Rules for the defects:
- Exactly these 13. Do not create other wrong behaviour; everything else must match the reference.
- Each must be reproducible from the student UI or Postman without trainer tools, except D06 (needs trainer toggle).
- No hints in UI text, logs visible to students, or OpenAPI descriptions.

---

## 9. Test data & sample assets

Simulated today default: **2026-11-23** (configurable). Personas are selected through the sample-image gallery: each front/back pair has a file name `P0x_front.jpg / P0x_back.jpg`; OCR returns that persona's data. Use clearly fictional names.

| Persona | idNumber | fullName | dob | expiryDate | Purpose |
|---|---|---|---|---|---|
| P01 | 001098001234 | NGUYEN VAN AN | 1998-05-15 | 2038-05-15 | Happy path (matches SRS example) |
| P02 | 079200004567 | TRAN THI BINH | 2000-01-01 | 2040-01-01 | Happy path 2; OCR address with wrong characters (3A) |
| P03 | 001208001111 | LE MINH CUONG | 2008-11-23 | 2048-11-23 | Exactly 18 today → allowed |
| P04 | 001208002222 | PHAM THU DUNG | 2008-11-24 | 2048-11-24 | 18 tomorrow → must reject (D02) |
| P05 | 001210003333 | VO HOANG EM | 2010-06-01 | 2050-06-01 | 16 years old (TT 25/2025 discussion point) |
| P06 | 001090000003 | HOANG VAN GIANG | 1990-03-03 | 2030-03-03 | Already has CIF (D05 / BR-105) |
| P07 | 001095004444 | DANG THI HANH | 1995-07-07 | 2026-11-23 | Expires today (D09) |
| P08 | 001055005555 | BUI VAN KHOA | 1955-02-02 | KHONG THOI HAN | No-expiry card (D09) |
| P09 | 001099006666 | NGO THI LAN | 1999-09-09 | 2025-09-09 | Expired → EKYC-01 |

Selfie samples (gallery "Video khuôn mặt"): `S_score_95.jpg`, `S_score_85.jpg`, `S_score_84_9.jpg`, `S_score_80.jpg`, `S_score_79_9.jpg`, `S_liveness_fail.jpg` (liveness false, score 90). Face check returns exactly the score in the file name; display name in gallery shows only "Mẫu 1…6" (students discover scores via API response or DevTools).

Size samples `public/samples/size/`: 99KB.jpg, 100KB.jpg, 101KB.jpg, 5MB.jpg (5 242 880 B), 5_1MB.jpg. The OCR endpoint reads the size with a `HEAD` request (Content-Length) on the given URL, so students can test the BR-102 boundaries in Postman just by passing these URLs — no large upload through a function. Generate images programmatically (simple card illustration with fictional data, watermark "MẪU – KHÔNG CÓ GIÁ TRỊ").

Phones: `0911111111` already registered (EKYC-03). Any other valid phone is free.

---

## 10. Deliverables

1. Working app deployed on Vercel (production URL) + local dev (`npm run dev`).
2. `README.md` (student): install, run, URL, Swagger link, Postman import, persona sheet **without** expected results, how to read the fake SMS inbox, "Ngày hệ thống" explanation. Windows + macOS steps.
3. `trainer/TRAINER_GUIDE.md`: PIN, profiles, all toggles, defect catalog (Section 8) with exact reproduction steps and expected vs actual, mapping to SRS traps, reset procedure, suggested homework flow.
4. `docs/openapi.yaml` + Swagger UI; `postman/` collection with folders B1–B6 + environment (`baseUrl`, `onboardingId`, `token` auto-set via test scripts).
5. `docs/IMPLEMENTATION_NOTES.md`: every decision where SRS was silent.
6. Test suites (Section 13) green.
7. Student distribution: students receive **only the Vercel URL**, never the repository. Server-side logic (including `lib/core/policy.ts`) is not visible in the browser.

---

## 11. Non-functional

- Each API < 500 ms on Vercel (except simulated delays); cold start acceptable.
- Works in Chrome/Edge/Safari latest; responsive 360–430 px phone frame centred on desktop.
- Logs: every API call stored in `api_logs` (masked password, OTP shown only in sms_outbox).
- Accessibility basics: labels on inputs, focus states, error text not colour-only.
- No external fonts/CDNs except Vercel Blob and the DB.

---

## 12. Phases (do in order, report after each)

| Phase | Output | Done when |
|---|---|---|
| P0 Scaffold | Next.js app, config, clock, sandbox, policy module, Drizzle schema + migrations + seed, health endpoint | `npm run dev` serves `/api/dev/health`; same works on a Vercel preview deployment |
| P1 API reference | Endpoints 1–7 with reference behaviour, error model, OpenAPI | API tests (reference) green |
| P2 UI | Screens S00–S09, gallery, SMS drawer, footer date | Happy path P01 completes in browser |
| P3 Simulators & trainer | Trainer panel + endpoints, network drop, core down, clock | All toggles work from panel |
| P4 Training profile | D01–D13 via `policy.ts` | Defect tests (training) green; reference tests still green |
| P5 Docs & deploy | README, TRAINER_GUIDE, Postman (baseUrl = Vercel URL), sample assets, Vercel env vars | Production URL works end-to-end from a clean browser |
| P6 Self-verification | Section 13 checklist filled in `docs/VERIFICATION.md` | All boxes ticked |

---

## 13. Acceptance checks

**Automated**
- `npm test` runs API tests on two test sandboxes: profile `reference` (all business rules pass) and profile `training` (each D01–D13 has one test asserting the training behaviour).
- Playwright smoke: P01 happy path; P09 expired → EKYC-01 message; 3A address edit saved.

**Manual checklist (agent fills in `docs/VERIFICATION.md`)**
- [ ] Every SRS code (B1–B6, 3A, 4A, 6A, BR-101–105, EKYC-01/02/03/99) is implemented and visible in API responses or logs.
- [ ] Submit request/response match SRS Section 5 examples field-for-field for P01.
- [ ] `grep -ri "bug\|defect\|seed.*fault\|intentional"` in `src/` and `web/` returns nothing.
- [ ] No route, page, source map or public file exposes `trainer/` content or `policy.ts` source (production `productionBrowserSourceMaps: false`).
- [ ] Two sandboxes used at the same time do not see each other's data.
- [ ] Trainer reset restores seed data in < 3 s.
- [ ] Changing simulated date changes age/expiry results for P03, P04, P07.
- [ ] All 13 defects reproduced manually following TRAINER_GUIDE steps.

---

## 14. Student homework (for README, no answers)

"Thực thi ≥ 12 Test Scenario bạn đã viết ở Buổi 1 trên ứng dụng NeoBank. Với mỗi kịch bản ghi: Mã TS, dữ liệu dùng (persona/ảnh mẫu), các bước, kết quả mong đợi (theo SRS), kết quả thực tế, Pass/Fail, bằng chứng (ảnh chụp màn hình hoặc request/response). Mỗi kịch bản Fail cần chỉ ra mục SRS liên quan."

Trainer grading hint (in TRAINER_GUIDE only): ≥ 6 of 13 defects found = Good; ≥ 9 = Excellent; D04/D07/D10/D13 need API testing → preview for Session 2.

---

## 15. Vercel-specific rules (MUST follow)

### 15.1 Platform constraints and how to handle them
| Constraint | Impact on this app | Required design |
|---|---|---|
| Function request/response body max **4.5 MB** (larger → 413 `FUNCTION_PAYLOAD_TOO_LARGE`) | BR-102 allows images up to 5 MB and the BVA tests use 5 MB / 5.1 MB files | Never send image bytes to a Route Handler. UI uploads with Vercel Blob **client upload**; API endpoints take image **URLs**; size is checked via `HEAD` Content-Length. |
| No writable/persistent local disk | No file database on Vercel | Neon Postgres (`DATABASE_URL` pooled for runtime, `DATABASE_URL_UNPOOLED` for migrations) — injected by the Neon integration |
| Stateless instances | OTP timers, locks, toggles cannot be in memory | Store every state + all trainer settings in DB; compute expiry from timestamps and the simulated clock |
| Env vars need redeploy to change | Trainer must switch profile/date live | Profile, simulated date, network toggles stored in `settings` table (per sandbox); env only holds `DEFAULT_PROFILE` |
| Function duration limit | Timeout simulation (EKYC-99 / 504) | Simulate with a short configurable delay (≤ 5 s) then return the error; never hang |

### 15.2 Environment variables
| Variable | Set by | Use |
|---|---|---|
| `DATABASE_URL` | Neon integration | Runtime queries (pooled) |
| `DATABASE_URL_UNPOOLED` | Neon integration | `drizzle-kit migrate` during build |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store (tick "Add a read-write token env var") | Sign client-upload tokens |
| `SESSION_SECRET` | You (≥ 32 random chars) | Sign onboarding JWT + trainer cookie |
| `TRAINER_PIN` | You | Trainer login |
| `READONLY_DB_PASSWORD` | You (≥ 32 random chars) | Password of Postgres role `ekyc_readonly` used by `/sql` |
| `DEFAULT_PROFILE` | You (`training`) | Profile for newly created sandboxes |
| `DEFAULT_TODAY` | You (`2026-11-23`) | Simulated date for newly created sandboxes |

Build command: `npm run vercel-build` = `drizzle-kit migrate && tsx db/post-migrate.ts && next build` (post-migrate creates/updates the read-only role, views and the default sandbox `DEMO01` idempotently).

### 15.3 Sandboxes (one hosted app, several learners)
- Each learner works in a **sandbox** (`sandbox_id`). Trainer creates sandboxes in `/trainer` (name + 6-char code). Learner opens `/?s=CODE` once; the code is stored in a cookie and sent by Postman as header `X-Sandbox-Id`.
- Reset, profile, simulated date and network toggles apply **per sandbox**, so resetting one learner never affects another.
- Seed data is created per sandbox on creation/reset.

### 15.5 Read-only SQL page (`/sql`) — replaces "open the .db file"
- Page with a SQL editor + result grid. Accepts only a single `SELECT` statement (reject `;`-chained statements, PRAGMA, ATTACH, INSERT/UPDATE/DELETE/DDL), max 200 rows, 3 s timeout.
- Postgres role `ekyc_readonly` (LOGIN, password `READONLY_DB_PASSWORD`) has `USAGE` on schema `learner` and `SELECT` on its views only — no access to base tables.
- Views in schema `learner`: `customers`, `accounts`, `onboarding_sessions`, `sms_outbox`, `api_logs` (no `password_hash`, no `otp_hash`), each `WHERE sandbox_id = current_setting('app.sandbox_id', true)`.
- Execution: build a connection string for `ekyc_readonly` from `DATABASE_URL` (same host/db, swap user/password); run with the Neon HTTP driver as one non-interactive transaction: `SET LOCAL statement_timeout = '3s'`, `SELECT set_config('app.sandbox_id', $1, true)`, `SET LOCAL search_path = learner`, then the learner query (read-only transaction).
- Reject before executing: more than one statement, and any of `set_config`, `current_setting`, `pg_`, `dblink`, `copy`, `;` inside the text (case-insensitive). Learners write e.g. `SELECT * FROM customers WHERE ...` (Postgres syntax).
- Same feature as API: `POST /api/v1/sql/query { sql }` for Postman practice.

### 15.6 Uploads with Vercel Blob
- Store access: **public** (images are fictional). Client upload route `POST /api/v1/onboarding/upload-token` uses `handleUpload`; in `onBeforeGenerateToken` require a valid onboarding JWT passed in `clientPayload`; allow `image/jpeg`, `image/png`; `maximumSizeInBytes` = 6 MB (so 5.1 MB files can reach the app's own BR-102 check); pathname prefix `ekyc/{sandboxId}/`.
- `ocr` and `face-check` accept only URLs whose host is the app's own origin (`/samples/...`) or `*.public.blob.vercel-storage.com` (prevent SSRF). Size = `HEAD` Content-Length.
- Sample images are committed in `public/samples/`, generated once by `npm run gen:samples` (sharp); size files padded to exact byte counts.

### 15.7 Auth & sessions
- Onboarding token: JWT HS256 (`jose`), 30 min, claims `{ onboardingId, sandboxId }`.
- Sandbox: cookie `sbx` (httpOnly, set by `/?s=CODE`) or header `X-Sandbox-Id: CODE` (Postman). Missing → use `DEMO01`.
- Trainer: `/trainer` asks PIN → httpOnly signed cookie 8 h; trainer APIs accept the cookie or header `X-Trainer-Pin`.
- Simulated date affects only business dates (age, CCCD expiry, created dates shown to user). OTP 60 s, 30-min and 24-h locks use real time.

### 15.4 Hosting plan note (for the trainer, not the agent)
Vercel's Hobby (free) plan is limited to personal, non-commercial use; a paid course should run on the Pro plan. Alternative: run it locally with `npm run dev` and share the screen, or host on another provider.
