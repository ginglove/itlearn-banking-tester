import { NextRequest } from 'next/server';
import { db, schema } from '@/lib/db';
import { extractSandboxFromRequest } from '@/lib/sandbox';
import { getSandboxSettings } from '@/lib/settings';
import { otpResendRules } from '@/lib/core/policy';
import {
  generateRequestId,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-helper';
import { eq, and } from 'drizzle-orm';

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

  const { onboardingId } = body || {};

  if (!onboardingId) {
    return createErrorResponse(
      req,
      requestId,
      'VAL-400',
      'Mã phiên onboardingId là bắt buộc',
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
  const rules = otpResendRules(settings.profile);

  // Check if resend limit reached
  if (session.otpResendCount >= rules.maxAllowedResends) {
    return createErrorResponse(
      req,
      requestId,
      'OTP-03',
      'Đã vượt quá số lần yêu cầu gửi lại mã OTP (tối đa 3 lần)',
      429,
      body
    );
  }

  const updatedResendCount = session.otpResendCount + 1;
  const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const newExpiresAt = new Date(Date.now() + 60 * 1000);

  const updates: Record<string, any> = {
    otpHash: newOtp,
    otpExpiresAt: newExpiresAt,
    otpResendCount: updatedResendCount,
  };

  if (rules.resetsWrongAttemptCounter) {
    updates.otpWrongCount = 0;
  }

  await db
    .update(schema.onboardingSessions)
    .set(updates)
    .where(eq(schema.onboardingSessions.id, onboardingId));

  // Add SMS notification
  await db.insert(schema.smsOutbox).values({
    sandboxId,
    phoneNumber: session.phoneNumber,
    content: `[NeoBank] Ma xac thuc OTP moi cua ban la ${newOtp}. Hieu luc trong 60 giay.`,
  });

  return createSuccessResponse(
    req,
    requestId,
    {
      otpExpiresIn: 60,
      resendRemaining: Math.max(0, rules.maxAllowedResends - updatedResendCount),
    },
    200,
    body
  );
}
