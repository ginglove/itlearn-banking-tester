import {
  pgTable,
  text,
  integer,
  bigint,
  real,
  timestamp,
  serial,
  primaryKey,
} from 'drizzle-orm/pg-core';

export const sandboxes = pgTable('sandboxes', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable(
  'settings',
  {
    sandboxId: text('sandbox_id').notNull(),
    key: text('key').notNull(),
    value: text('value').notNull(),
  },
  (t) => [primaryKey({ columns: [t.sandboxId, t.key] })]
);

export const customers = pgTable(
  'customers',
  {
    sandboxId: text('sandbox_id').notNull(),
    cifNumber: text('cif_number').notNull(),
    idNumber: text('id_number').notNull(),
    fullName: text('full_name').notNull(),
    dob: text('dob').notNull(), // ISO YYYY-MM-DD
    expiryDate: text('expiry_date').notNull(), // ISO YYYY-MM-DD or KHONG THOI HAN
    phoneNumber: text('phone_number').notNull(),
    email: text('email'),
    address: text('address'),
    passwordHash: text('password_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sandboxId, t.cifNumber] })]
);

export const accounts = pgTable(
  'accounts',
  {
    sandboxId: text('sandbox_id').notNull(),
    accountNumber: text('account_number').notNull(),
    cifNumber: text('cif_number').notNull(),
    product: text('product').notNull().default('CASA'),
    status: text('status').notNull().default('ACTIVE'),
    balance: bigint('balance', { mode: 'number' }).notNull().default(0),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sandboxId, t.accountNumber] })]
);

export const onboardingSessions = pgTable('onboarding_sessions', {
  id: text('id').primaryKey(),
  sandboxId: text('sandbox_id').notNull(),
  phoneNumber: text('phone_number').notNull(),
  email: text('email'),
  status: text('status').notNull().default('INIT'), // INIT, OTP_VERIFIED, OCR_COMPLETED, FACE_VERIFIED, COMPLETED, LOCKED
  otpHash: text('otp_hash'),
  otpExpiresAt: timestamp('otp_expires_at', { withTimezone: true }),
  otpWrongCount: integer('otp_wrong_count').notNull().default(0),
  otpResendCount: integer('otp_resend_count').notNull().default(0),
  faceFailCount: integer('face_fail_count').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  ocrJson: text('ocr_json'),
  faceScore: real('face_score'),
  cifNumber: text('cif_number'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const phoneLocks = pgTable(
  'phone_locks',
  {
    sandboxId: text('sandbox_id').notNull(),
    phoneNumber: text('phone_number').notNull(),
    lockedUntil: timestamp('locked_until', { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.sandboxId, t.phoneNumber] })]
);

export const smsOutbox = pgTable('sms_outbox', {
  id: serial('id').primaryKey(),
  sandboxId: text('sandbox_id').notNull(),
  phoneNumber: text('phone_number').notNull(),
  content: text('content').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
});

export const apiLogs = pgTable('api_logs', {
  id: serial('id').primaryKey(),
  sandboxId: text('sandbox_id').notNull(),
  requestId: text('request_id').notNull(),
  method: text('method').notNull(),
  path: text('path').notNull(),
  status: integer('status').notNull(),
  requestJson: text('request_json'),
  responseJson: text('response_json'),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
});
