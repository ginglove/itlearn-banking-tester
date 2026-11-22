import { NextRequest } from 'next/server';
import { db, schema } from '@/lib/db';
import { extractSandboxFromRequest } from '@/lib/sandbox';
import { signOnboardingToken } from '@/lib/auth';
import {
  generateRequestId,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-helper';
import { eq, and, gt } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const sandboxId = extractSandboxFromRequest(req);

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

  const { onboardingId, otp } = body || {};

  if (!onboardingId || !otp) {
    return createErrorResponse(
      req,
      requestId,
      'VAL-400',
      'onboardingId và otp là bắt buộc',
      400,
      body
    );
  }

  const sessions = await db
    .select()
    .from(schema.onboardingSessions)
    .where(
      and(
        eq(schema.onboardingSessions.id, onboardingId),
        eq(schema.onboardingSessions.sandboxId, sandboxId)
      )
    )
    .limit(1);

  if (sessions.length === 0) {
    return createErrorResponse(
      req,
      requestId,
      'AUTH-401',
      'Phiên làm việc không tồn tại hoặc đã hết hạn',
      401,
      body
    );
  }

  const session = sessions[0];

  // Check phone locks
  const lock = await db
    .select()
    .from(schema.phoneLocks)
    .where(
      and(
        eq(schema.phoneLocks.sandboxId, sandboxId),
        eq(schema.phoneLocks.phoneNumber, session.phoneNumber),
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

  const isExpired = session.otpExpiresAt ? new Date() > session.otpExpiresAt : true;
  const isMatch = session.otpHash === String(otp).trim();

  if (isExpired || !isMatch) {
    const updatedWrongCount = session.otpWrongCount + 1;

    // After 5 wrong attempts, lock phone for 24 hours (BR-104)
    if (updatedWrongCount >= 5) {
      const lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await db
        .insert(schema.phoneLocks)
        .values({
          sandboxId,
          phoneNumber: session.phoneNumber,
          lockedUntil: lockUntil,
        })
        .onConflictDoUpdate({
          target: [schema.phoneLocks.sandboxId, schema.phoneLocks.phoneNumber],
          set: { lockedUntil: lockUntil },
        });

      await db
        .update(schema.onboardingSessions)
        .set({
          otpWrongCount: updatedWrongCount,
          lockedUntil: lockUntil,
          status: 'LOCKED',
        })
        .where(eq(schema.onboardingSessions.id, onboardingId));

      return createErrorResponse(
        req,
        requestId,
        'OTP-02',
        'Số điện thoại tạm khóa 24 giờ do nhập sai mã OTP 5 lần',
        429,
        body
      );
    }

    await db
      .update(schema.onboardingSessions)
      .set({ otpWrongCount: updatedWrongCount })
      .where(eq(schema.onboardingSessions.id, onboardingId));

    return createErrorResponse(
      req,
      requestId,
      'OTP-01',
      'Mã OTP không đúng hoặc đã hết hạn',
      400,
      body
    );
  }

  // OTP verified successfully
  await db
    .update(schema.onboardingSessions)
    .set({
      status: 'OTP_VERIFIED',
      otpWrongCount: 0,
    })
    .where(eq(schema.onboardingSessions.id, onboardingId));

  const onboardingToken = await signOnboardingToken({
    onboardingId: session.id,
    sandboxId,
    phoneNumber: session.phoneNumber,
  });

  return createSuccessResponse(
    req,
    requestId,
    {
      onboardingToken,
    },
    200,
    body
  );
}
