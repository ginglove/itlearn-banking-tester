import { NextRequest } from 'next/server';
import { db, schema } from '@/lib/db';
import { extractSandboxFromRequest } from '@/lib/sandbox';
import { getSandboxSettings } from '@/lib/settings';
import { validatePhonePrefix } from '@/lib/core/policy';
import {
  generateRequestId,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-helper';
import { eq, and, gt } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const sandboxId = extractSandboxFromRequest(req);
  const settings = await getSandboxSettings(sandboxId);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse(
      req,
      requestId,
      'VAL-400',
      'Định dạng JSON không hợp lệ',
      400
    );
  }

  const { phoneNumber, email } = body || {};

  if (!phoneNumber) {
    return createErrorResponse(
      req,
      requestId,
      'VAL-400',
      'Số điện thoại là bắt buộc',
      400,
      body
    );
  }

  // Validate phone number format / prefix according to active policy
  if (!validatePhonePrefix(phoneNumber, settings.profile)) {
    return createErrorResponse(
      req,
      requestId,
      'VAL-400',
      'Số điện thoại không hợp lệ (phải gồm 10 chữ số với đầu số 03, 05, 07, 08, 09)',
      400,
      body
    );
  }

  // Check 24-hour phone lock (BR-104)
  const lock = await db
    .select()
    .from(schema.phoneLocks)
    .where(
      and(
        eq(schema.phoneLocks.sandboxId, sandboxId),
        eq(schema.phoneLocks.phoneNumber, phoneNumber),
        gt(schema.phoneLocks.lockedUntil, new Date())
      )
    )
    .limit(1);

  if (lock.length > 0) {
    return createErrorResponse(
      req,
      requestId,
      'OTP-02',
      'Số điện thoại tạm khóa 24 giờ do nhập sai OTP quá 5 lần',
      429,
      body
    );
  }

  // Check phone existence in Core Banking (B2 -> EKYC-03)
  const existingCustomer = await db
    .select()
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.sandboxId, sandboxId),
        eq(schema.customers.phoneNumber, phoneNumber)
      )
    )
    .limit(1);

  if (existingCustomer.length > 0) {
    return createErrorResponse(
      req,
      requestId,
      'EKYC-03',
      'Số điện thoại đã được đăng ký trên hệ thống',
      409,
      body
    );
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const onboardingId = randomUUID();
  const otpExpiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds

  // Create onboarding session
  await db.insert(schema.onboardingSessions).values({
    id: onboardingId,
    sandboxId,
    phoneNumber,
    email: email || null,
    status: 'INIT',
    otpHash: otp,
    otpExpiresAt,
    otpWrongCount: 0,
    otpResendCount: 0,
    faceFailCount: 0,
  });

  // Record SMS in simulated outbox
  await db.insert(schema.smsOutbox).values({
    sandboxId,
    phoneNumber,
    content: `[NeoBank] Ma xac thuc OTP cua ban la ${otp}. Ma co hieu luc trong 60 giay. Khong chia se ma nay cho bat ky ai.`,
  });

  return createSuccessResponse(
    req,
    requestId,
    {
      onboardingId,
      otpExpiresIn: 60,
      resendRemaining: 3,
    },
    200,
    body
  );
}
