import { NextRequest } from 'next/server';
import { db, schema } from '@/lib/db';
import { extractSandboxFromRequest } from '@/lib/sandbox';
import { getSandboxSettings } from '@/lib/settings';
import { faceThreshold, biometricLockStorage } from '@/lib/core/policy';
import {
  generateRequestId,
  createErrorResponse,
  createSuccessResponse,
  authenticateOnboarding,
} from '@/lib/api-helper';
import { resolveSelfieResult } from '@/lib/modules/personas';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const payload = await authenticateOnboarding(req);

  if (!payload) {
    return createErrorResponse(
      req,
      requestId,
      'AUTH-401',
      'Phiên làm việc không hợp lệ hoặc đã hết hạn',
      401
    );
  }

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

  const { selfieUrl } = body || {};

  if (!selfieUrl) {
    return createErrorResponse(
      req,
      requestId,
      'VAL-400',
      'selfieUrl là bắt buộc',
      400,
      body
    );
  }

  const sessions = await db
    .select()
    .from(schema.onboardingSessions)
    .where(
      and(
        eq(schema.onboardingSessions.id, payload.onboardingId),
        eq(schema.onboardingSessions.sandboxId, sandboxId)
      )
    )
    .limit(1);

  if (sessions.length === 0) {
    return createErrorResponse(
      req,
      requestId,
      'AUTH-401',
      'Phiên làm việc không tồn tại',
      401,
      body
    );
  }

  const session = sessions[0];

  // Check 30-min session lock (4A)
  if (session.lockedUntil && new Date() < session.lockedUntil) {
    return createErrorResponse(
      req,
      requestId,
      'SES-01',
      'Phiên eKYC tạm khóa 30 phút do xác thực khuôn mặt không thành công 3 lần',
      423,
      body
    );
  }

  const selfieResult = resolveSelfieResult(selfieUrl);
  const threshold = faceThreshold(settings.profile);
  const isPassed = selfieResult.livenessPassed && selfieResult.faceMatchScore >= threshold;

  if (!isPassed) {
    const updatedFailCount = session.faceFailCount + 1;
    const lockMode = biometricLockStorage(settings.profile);

    if (updatedFailCount >= 3) {
      const lockUntil =
        lockMode === 'server_storage'
          ? new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
          : null;

      await db
        .update(schema.onboardingSessions)
        .set({
          faceFailCount: updatedFailCount,
          lockedUntil: lockUntil,
          status: lockUntil ? 'LOCKED' : session.status,
        })
        .where(eq(schema.onboardingSessions.id, payload.onboardingId));

      return createErrorResponse(
        req,
        requestId,
        'EKYC-02',
        'Xác thực khuôn mặt không thành công. Đã vượt quá 3 lần thử, phiên eKYC tạm khóa 30 phút.',
        400,
        body,
        [{ attemptsRemaining: 0, livenessPassed: selfieResult.livenessPassed, faceMatchScore: selfieResult.faceMatchScore }]
      );
    }

    await db
      .update(schema.onboardingSessions)
      .set({ faceFailCount: updatedFailCount })
      .where(eq(schema.onboardingSessions.id, payload.onboardingId));

    return createErrorResponse(
      req,
      requestId,
      'EKYC-02',
      'Xác thực khuôn mặt không thành công',
      400,
      body,
      [{ attemptsRemaining: 3 - updatedFailCount, livenessPassed: selfieResult.livenessPassed, faceMatchScore: selfieResult.faceMatchScore }]
    );
  }

  // Verification passed
  await db
    .update(schema.onboardingSessions)
    .set({
      faceScore: selfieResult.faceMatchScore,
      faceFailCount: 0,
      status: 'FACE_VERIFIED',
    })
    .where(eq(schema.onboardingSessions.id, payload.onboardingId));

  return createSuccessResponse(
    req,
    requestId,
    {
      livenessPassed: true,
      faceMatchScore: selfieResult.faceMatchScore,
      attemptsRemaining: 3,
      passed: true,
    },
    200,
    body
  );
}
