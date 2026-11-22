import { describe, it, expect, beforeAll } from 'vitest';
import { seedSandbox } from '@/db/seed';
import { setSandboxSettings } from '@/lib/settings';
import { POST as requestOtp } from '@/app/api/v1/onboarding/otp/request/route';
import { POST as resendOtp } from '@/app/api/v1/onboarding/otp/resend/route';
import { POST as verifyOtp } from '@/app/api/v1/onboarding/otp/verify/route';
import { POST as processOcr } from '@/app/api/v1/onboarding/ocr/route';
import { POST as checkFace } from '@/app/api/v1/onboarding/face-check/route';
import { POST as submitEkyc } from '@/app/api/v1/onboarding/ekyc-submit/route';
import { NextRequest } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

const SANDBOX_REF = 'REF_01';

function makeRequest(
  url: string,
  method = 'POST',
  body?: any,
  token?: string,
  sandboxId = SANDBOX_REF
): NextRequest {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('X-Sandbox-Id', sandboxId);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('API Reference Behaviour (Standard Business Rules)', () => {
  beforeAll(async () => {
    await seedSandbox(SANDBOX_REF, 'Reference Sandbox');
    await setSandboxSettings(SANDBOX_REF, {
      profile: 'reference',
      today: '2026-11-23',
      dropAfterCoreCommit: false,
      coreDown: false,
    });
  });

  it('B1: Rejects invalid phone prefix (0212345678) with VAL-400', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/onboarding/otp/request', 'POST', {
      phoneNumber: '0212345678',
    });
    const res = await requestOtp(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.responseCode).toBe('VAL-400');
  });

  it('B2: Rejects existing phone number (0911111111) with 409 EKYC-03', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/onboarding/otp/request', 'POST', {
      phoneNumber: '0911111111',
    });
    const res = await requestOtp(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.responseCode).toBe('EKYC-03');
  });

  it('BR-104: OTP wrong attempts lockout after 5 failures', async () => {
    // 1. Request OTP
    const req1 = makeRequest('http://localhost:3000/api/v1/onboarding/otp/request', 'POST', {
      phoneNumber: '0988776655',
    });
    const res1 = await requestOtp(req1);
    expect(res1.status).toBe(200);
    const { onboardingId } = await res1.json();

    // 2. Submit wrong OTP 4 times -> 400 OTP-01
    for (let i = 0; i < 4; i++) {
      const wrongReq = makeRequest('http://localhost:3000/api/v1/onboarding/otp/verify', 'POST', {
        onboardingId,
        otp: '000000',
      });
      const wrongRes = await verifyOtp(wrongReq);
      expect(wrongRes.status).toBe(400);
      const data = await wrongRes.json();
      expect(data.responseCode).toBe('OTP-01');
    }

    // 3. 5th wrong attempt locks phone for 24h -> 429 OTP-02
    const fifthReq = makeRequest('http://localhost:3000/api/v1/onboarding/otp/verify', 'POST', {
      onboardingId,
      otp: '000000',
    });
    const fifthRes = await verifyOtp(fifthReq);
    expect(fifthRes.status).toBe(429);
    const data = await fifthRes.json();
    expect(data.responseCode).toBe('OTP-02');
  });

  it('BR-104: Maximum 3 OTP resends', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/onboarding/otp/request', 'POST', {
      phoneNumber: '0977889900',
    });
    const res = await requestOtp(req);
    const { onboardingId } = await res.json();

    // Resend 1, 2, 3 should succeed
    for (let i = 1; i <= 3; i++) {
      const resendReq = makeRequest('http://localhost:3000/api/v1/onboarding/otp/resend', 'POST', {
        onboardingId,
      });
      const resendRes = await resendOtp(resendReq);
      expect(resendRes.status).toBe(200);
      const data = await resendRes.json();
      expect(data.resendRemaining).toBe(3 - i);
    }

    // 4th resend must fail with 429 OTP-03
    const fourthReq = makeRequest('http://localhost:3000/api/v1/onboarding/otp/resend', 'POST', {
      onboardingId,
    });
    const fourthRes = await resendOtp(fourthReq);
    expect(fourthRes.status).toBe(429);
    const data = await fourthRes.json();
    expect(data.responseCode).toBe('OTP-03');
  });

  it('BR-102: Reject expired CCCD (P09) with 400 EKYC-01', async () => {
    // 1. Create verified session
    const reqOtp = makeRequest('http://localhost:3000/api/v1/onboarding/otp/request', 'POST', {
      phoneNumber: '0966554433',
    });
    const resOtp = await requestOtp(reqOtp);
    const { onboardingId } = await resOtp.json();

    // Fetch generated OTP
    const session = await db
      .select()
      .from(schema.onboardingSessions)
      .where(eq(schema.onboardingSessions.id, onboardingId));
    const tokenRes = await verifyOtp(
      makeRequest('http://localhost:3000/api/v1/onboarding/otp/verify', 'POST', {
        onboardingId,
        otp: session[0].otpHash,
      })
    );
    const { onboardingToken } = await tokenRes.json();

    // 2. OCR with P09 (expired)
    const ocrReq = makeRequest(
      'http://localhost:3000/api/v1/onboarding/ocr',
      'POST',
      {
        frontImageUrl: '/samples/P09_front.jpg',
        backImageUrl: '/samples/P09_back.jpg',
      },
      onboardingToken
    );
    const ocrRes = await processOcr(ocrReq);
    expect(ocrRes.status).toBe(400);
    const ocrData = await ocrRes.json();
    expect(ocrData.responseCode).toBe('EKYC-01');
  });

  it('BR-101: Reject under-18 customer (P04) with 400 EKYC-04', async () => {
    const reqOtp = makeRequest('http://localhost:3000/api/v1/onboarding/otp/request', 'POST', {
      phoneNumber: '0966112233',
    });
    const resOtp = await requestOtp(reqOtp);
    const { onboardingId } = await resOtp.json();

    const session = await db
      .select()
      .from(schema.onboardingSessions)
      .where(eq(schema.onboardingSessions.id, onboardingId));
    const tokenRes = await verifyOtp(
      makeRequest('http://localhost:3000/api/v1/onboarding/otp/verify', 'POST', {
        onboardingId,
        otp: session[0].otpHash,
      })
    );
    const { onboardingToken } = await tokenRes.json();

    const ocrReq = makeRequest(
      'http://localhost:3000/api/v1/onboarding/ocr',
      'POST',
      {
        frontImageUrl: '/samples/P04_front.jpg',
        backImageUrl: '/samples/P04_back.jpg',
      },
      onboardingToken
    );
    const ocrRes = await processOcr(ocrReq);
    expect(ocrRes.status).toBe(400);
    const ocrData = await ocrRes.json();
    expect(ocrData.responseCode).toBe('EKYC-04');
  });

  it('BR-103: Face match score < 85.0 fails (84.9 score rejected)', async () => {
    const reqOtp = makeRequest('http://localhost:3000/api/v1/onboarding/otp/request', 'POST', {
      phoneNumber: '0944332211',
    });
    const resOtp = await requestOtp(reqOtp);
    const { onboardingId } = await resOtp.json();

    const session = await db
      .select()
      .from(schema.onboardingSessions)
      .where(eq(schema.onboardingSessions.id, onboardingId));
    const tokenRes = await verifyOtp(
      makeRequest('http://localhost:3000/api/v1/onboarding/otp/verify', 'POST', {
        onboardingId,
        otp: session[0].otpHash,
      })
    );
    const { onboardingToken } = await tokenRes.json();

    const faceReq = makeRequest(
      'http://localhost:3000/api/v1/onboarding/face-check',
      'POST',
      {
        selfieUrl: '/samples/S_score_84_9.jpg',
      },
      onboardingToken
    );
    const faceRes = await checkFace(faceReq);
    expect(faceRes.status).toBe(400);
    const faceData = await faceRes.json();
    expect(faceData.responseCode).toBe('EKYC-02');
  });

  it('Happy Path B1-B6 (P01): Successfully creates CIF and ACTIVE CASA account', async () => {
    // 1. Request OTP
    const reqOtp = makeRequest('http://localhost:3000/api/v1/onboarding/otp/request', 'POST', {
      phoneNumber: '0912998877',
      email: 'p01@example.com',
    });
    const resOtp = await requestOtp(reqOtp);
    const { onboardingId } = await resOtp.json();

    // 2. Verify OTP
    const session = await db
      .select()
      .from(schema.onboardingSessions)
      .where(eq(schema.onboardingSessions.id, onboardingId));
    const tokenRes = await verifyOtp(
      makeRequest('http://localhost:3000/api/v1/onboarding/otp/verify', 'POST', {
        onboardingId,
        otp: session[0].otpHash,
      })
    );
    const { onboardingToken } = await tokenRes.json();

    // 3. OCR with P01
    const ocrReq = makeRequest(
      'http://localhost:3000/api/v1/onboarding/ocr',
      'POST',
      {
        frontImageUrl: '/samples/P01_front.jpg',
        backImageUrl: '/samples/P01_back.jpg',
      },
      onboardingToken
    );
    const ocrRes = await processOcr(ocrReq);
    expect(ocrRes.status).toBe(200);
    const ocrData = await ocrRes.json();
    expect(ocrData.idNumber).toBe('001098001234');

    // 4. Face check with score 95
    const faceReq = makeRequest(
      'http://localhost:3000/api/v1/onboarding/face-check',
      'POST',
      {
        selfieUrl: '/samples/S_score_95.jpg',
      },
      onboardingToken
    );
    const faceRes = await checkFace(faceReq);
    expect(faceRes.status).toBe(200);
    const faceData = await faceRes.json();
    expect(faceData.passed).toBe(true);

    // 5. Submit eKYC
    const submitReq = makeRequest(
      'http://localhost:3000/api/v1/onboarding/ekyc-submit',
      'POST',
      {
        phoneNumber: '0912998877',
        idNumber: ocrData.idNumber,
        fullName: ocrData.fullName,
        dob: ocrData.dob,
        expiryDate: ocrData.expiryDate,
        faceMatchScore: 95.0,
        email: 'p01@example.com',
        address: ocrData.address,
        password: 'Password@2026',
        onboardingId,
      },
      onboardingToken
    );
    const submitRes = await submitEkyc(submitReq);
    expect(submitRes.status).toBe(200);
    const submitData = await submitRes.json();

    expect(submitData.responseCode).toBe('00');
    expect(submitData.message).toBe('Khoi tao tai khoan thanh cong');
    expect(submitData.data.status).toBe('ACTIVE');
    expect(submitData.data.cifNumber).toBeDefined();
    expect(submitData.data.accountNumber).toBeDefined();
  });
});
