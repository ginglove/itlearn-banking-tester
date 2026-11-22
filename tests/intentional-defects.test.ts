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

const SBX_TRAIN = 'TRN_01';
const SBX_REF = 'REF_02';

function makeRequest(
  url: string,
  method = 'POST',
  body?: any,
  token?: string,
  sandboxId = SBX_TRAIN
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

async function getOnboardingTokenForSandbox(sandboxId: string, phone: string) {
  const reqOtp = makeRequest(
    'http://localhost:3000/api/v1/onboarding/otp/request',
    'POST',
    { phoneNumber: phone },
    undefined,
    sandboxId
  );
  const resOtp = await requestOtp(reqOtp);
  const { onboardingId } = await resOtp.json();

  const session = await db
    .select()
    .from(schema.onboardingSessions)
    .where(
      and(
        eq(schema.onboardingSessions.id, onboardingId),
        eq(schema.onboardingSessions.sandboxId, sandboxId)
      )
    );

  const tokenRes = await verifyOtp(
    makeRequest(
      'http://localhost:3000/api/v1/onboarding/otp/verify',
      'POST',
      { onboardingId, otp: session[0].otpHash },
      undefined,
      sandboxId
    )
  );
  const { onboardingToken } = await tokenRes.json();
  return { onboardingId, onboardingToken };
}

describe('Profile Matrix: Training vs Reference Behaviours (D01 - D13)', () => {
  beforeAll(async () => {
    await seedSandbox(SBX_TRAIN, 'Training Sandbox');
    await setSandboxSettings(SBX_TRAIN, {
      profile: 'training',
      today: '2026-11-23',
      dropAfterCoreCommit: false,
      coreDown: false,
    });

    await seedSandbox(SBX_REF, 'Reference Sandbox');
    await setSandboxSettings(SBX_REF, {
      profile: 'reference',
      today: '2026-11-23',
      dropAfterCoreCommit: false,
      coreDown: false,
    });
  });

  // D01: Face Threshold
  it('D01: Face score 80.0 passes in training, rejected in reference', async () => {
    const trainAuth = await getOnboardingTokenForSandbox(SBX_TRAIN, '0981111001');
    const refAuth = await getOnboardingTokenForSandbox(SBX_REF, '0982222001');

    // Training: score 80.0 passes (threshold 80.0)
    const trainFace = await checkFace(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/face-check',
        'POST',
        { selfieUrl: '/samples/S_score_80.jpg' },
        trainAuth.onboardingToken,
        SBX_TRAIN
      )
    );
    expect(trainFace.status).toBe(200);
    const trainData = await trainFace.json();
    expect(trainData.passed).toBe(true);

    // Reference: score 80.0 rejected (threshold 85.0)
    const refFace = await checkFace(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/face-check',
        'POST',
        { selfieUrl: '/samples/S_score_80.jpg' },
        refAuth.onboardingToken,
        SBX_REF
      )
    );
    expect(refFace.status).toBe(400);
    const refData = await refFace.json();
    expect(refData.responseCode).toBe('EKYC-02');
  });

  // D02: Age Evaluation
  it('D02: Persona P04 (turns 18 tomorrow) accepted in training, rejected in reference', async () => {
    const trainAuth = await getOnboardingTokenForSandbox(SBX_TRAIN, '0981111002');
    const refAuth = await getOnboardingTokenForSandbox(SBX_REF, '0982222002');

    // Training: accepted
    const trainOcr = await processOcr(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ocr',
        'POST',
        { frontImageUrl: '/samples/P04_front.jpg', backImageUrl: '/samples/P04_back.jpg' },
        trainAuth.onboardingToken,
        SBX_TRAIN
      )
    );
    expect(trainOcr.status).toBe(200);

    // Reference: rejected with EKYC-04
    const refOcr = await processOcr(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ocr',
        'POST',
        { frontImageUrl: '/samples/P04_front.jpg', backImageUrl: '/samples/P04_back.jpg' },
        refAuth.onboardingToken,
        SBX_REF
      )
    );
    expect(refOcr.status).toBe(400);
    const refData = await refOcr.json();
    expect(refData.responseCode).toBe('EKYC-04');
  });

  // D03: Password Policy
  it('D03: Simple password "1" accepted in training, rejected in reference', async () => {
    const trainAuth = await getOnboardingTokenForSandbox(SBX_TRAIN, '0981111003');
    const refAuth = await getOnboardingTokenForSandbox(SBX_REF, '0982222003');

    // Training submit
    const trainSubmit = await submitEkyc(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ekyc-submit',
        'POST',
        {
          phoneNumber: '0981111003',
          idNumber: '001098000003',
          fullName: 'NGUYEN VAN D03',
          dob: '1998-05-15',
          expiryDate: '2038-05-15',
          faceMatchScore: 95.0,
          password: '1',
          onboardingId: trainAuth.onboardingId,
        },
        trainAuth.onboardingToken,
        SBX_TRAIN
      )
    );
    expect(trainSubmit.status).toBe(200);

    // Reference submit: rejected for weak password
    const refSubmit = await submitEkyc(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ekyc-submit',
        'POST',
        {
          phoneNumber: '0982222003',
          idNumber: '001098000003',
          fullName: 'NGUYEN VAN D03',
          dob: '1998-05-15',
          expiryDate: '2038-05-15',
          faceMatchScore: 95.0,
          password: '1',
          onboardingId: refAuth.onboardingId,
        },
        refAuth.onboardingToken,
        SBX_REF
      )
    );
    expect(refSubmit.status).toBe(400);
    const refData = await refSubmit.json();
    expect(refData.responseCode).toBe('VAL-400');
  });

  // D04: Trust Client Score
  it('D04: Training accepts client score 99.0 without prior face check; reference rejects', async () => {
    const trainAuth = await getOnboardingTokenForSandbox(SBX_TRAIN, '0981111004');
    const refAuth = await getOnboardingTokenForSandbox(SBX_REF, '0982222004');

    // Training submit with arbitrary client score
    const trainSubmit = await submitEkyc(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ekyc-submit',
        'POST',
        {
          phoneNumber: '0981111004',
          idNumber: '001098000004',
          fullName: 'NGUYEN VAN D04',
          dob: '1998-05-15',
          expiryDate: '2038-05-15',
          faceMatchScore: 99.0,
          password: 'Password@2026',
          onboardingId: trainAuth.onboardingId,
        },
        trainAuth.onboardingToken,
        SBX_TRAIN
      )
    );
    expect(trainSubmit.status).toBe(200);

    // Reference submit without completed face check in session -> rejected
    const refSubmit = await submitEkyc(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ekyc-submit',
        'POST',
        {
          phoneNumber: '0982222004',
          idNumber: '001098000004',
          fullName: 'NGUYEN VAN D04',
          dob: '1998-05-15',
          expiryDate: '2038-05-15',
          faceMatchScore: 99.0,
          password: 'Password@2026',
          onboardingId: refAuth.onboardingId,
        },
        refAuth.onboardingToken,
        SBX_REF
      )
    );
    expect(refSubmit.status).toBe(400);
    const refData = await refSubmit.json();
    expect(refData.responseCode).toBe('VAL-400');
  });

  // D05: Duplicate CCCD
  it('D05: Duplicate CCCD (P06) returns 500 EKYC-99 in training; 409 EKYC-05 in reference', async () => {
    const trainAuth = await getOnboardingTokenForSandbox(SBX_TRAIN, '0981111005');
    const refAuth = await getOnboardingTokenForSandbox(SBX_REF, '0982222005');

    // Complete face check for reference session
    await checkFace(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/face-check',
        'POST',
        { selfieUrl: '/samples/S_score_95.jpg' },
        refAuth.onboardingToken,
        SBX_REF
      )
    );

    // Training: 500 EKYC-99
    const trainSubmit = await submitEkyc(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ekyc-submit',
        'POST',
        {
          phoneNumber: '0981111005',
          idNumber: '001090000003', // Existing CCCD (P06)
          fullName: 'HOANG VAN GIANG',
          dob: '1990-03-03',
          expiryDate: '2030-03-03',
          faceMatchScore: 95.0,
          password: 'Password@2026',
          onboardingId: trainAuth.onboardingId,
        },
        trainAuth.onboardingToken,
        SBX_TRAIN
      )
    );
    expect(trainSubmit.status).toBe(500);
    const trainData = await trainSubmit.json();
    expect(trainData.responseCode).toBe('EKYC-99');

    // Reference: 409 EKYC-05
    const refSubmit = await submitEkyc(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ekyc-submit',
        'POST',
        {
          phoneNumber: '0982222005',
          idNumber: '001090000003', // Existing CCCD (P06)
          fullName: 'HOANG VAN GIANG',
          dob: '1990-03-03',
          expiryDate: '2030-03-03',
          faceMatchScore: 95.0,
          password: 'Password@2026',
          onboardingId: refAuth.onboardingId,
        },
        refAuth.onboardingToken,
        SBX_REF
      )
    );
    expect(refSubmit.status).toBe(409);
    const refData = await refSubmit.json();
    expect(refData.responseCode).toBe('EKYC-05');
  });

  // D06: Flow 6A Retry Behavior with dropAfterCoreCommit
  it('D06: Network drop retry creates second CIF in training; idempotent in reference', async () => {
    // Enable dropAfterCoreCommit on training
    await setSandboxSettings(SBX_TRAIN, { dropAfterCoreCommit: true });

    const trainAuth = await getOnboardingTokenForSandbox(SBX_TRAIN, '0981111006');
    const firstSubmit = await submitEkyc(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ekyc-submit',
        'POST',
        {
          phoneNumber: '0981111006',
          idNumber: '001098999888',
          fullName: 'RETRY TEST KH',
          dob: '1995-01-01',
          expiryDate: '2035-01-01',
          faceMatchScore: 95.0,
          password: 'Password@2026',
          onboardingId: trainAuth.onboardingId,
        },
        trainAuth.onboardingToken,
        SBX_TRAIN
      )
    );
    expect(firstSubmit.status).toBe(500); // dropped connection

    // Turn off toggle and retry in training mode
    await setSandboxSettings(SBX_TRAIN, { dropAfterCoreCommit: false });
    const retrySubmit = await submitEkyc(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ekyc-submit',
        'POST',
        {
          phoneNumber: '0981111006',
          idNumber: '001098999888',
          fullName: 'RETRY TEST KH',
          dob: '1995-01-01',
          expiryDate: '2035-01-01',
          faceMatchScore: 95.0,
          password: 'Password@2026',
          onboardingId: trainAuth.onboardingId,
        },
        trainAuth.onboardingToken,
        SBX_TRAIN
      )
    );
    expect(retrySubmit.status).toBe(200);

    // Verify in DB: in training mode, two customer records exist for 001098999888
    const customerRecords = await db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.sandboxId, SBX_TRAIN),
          eq(schema.customers.idNumber, '001098999888')
        )
      );
    expect(customerRecords.length).toBe(2);
  });

  // D07: Altered Identity via API
  it('D07: Altered fullName accepted in training, rejected with VAL-400 in reference', async () => {
    const trainAuth = await getOnboardingTokenForSandbox(SBX_TRAIN, '0981111007');
    const refAuth = await getOnboardingTokenForSandbox(SBX_REF, '0982222007');

    // Run OCR for both
    await processOcr(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ocr',
        'POST',
        { frontImageUrl: '/samples/P01_front.jpg', backImageUrl: '/samples/P01_back.jpg' },
        trainAuth.onboardingToken,
        SBX_TRAIN
      )
    );
    await processOcr(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ocr',
        'POST',
        { frontImageUrl: '/samples/P01_front.jpg', backImageUrl: '/samples/P01_back.jpg' },
        refAuth.onboardingToken,
        SBX_REF
      )
    );

    // Pass face check for reference
    await checkFace(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/face-check',
        'POST',
        { selfieUrl: '/samples/S_score_95.jpg' },
        refAuth.onboardingToken,
        SBX_REF
      )
    );

    // Training submit with altered fullName
    const trainSubmit = await submitEkyc(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ekyc-submit',
        'POST',
        {
          phoneNumber: '0981111007',
          idNumber: '001098000007',
          fullName: 'HACKED FULLNAME',
          dob: '1998-05-15',
          expiryDate: '2038-05-15',
          faceMatchScore: 95.0,
          password: 'Password@2026',
          onboardingId: trainAuth.onboardingId,
        },
        trainAuth.onboardingToken,
        SBX_TRAIN
      )
    );
    expect(trainSubmit.status).toBe(200);

    // Reference submit with altered fullName -> VAL-400
    const refSubmit = await submitEkyc(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ekyc-submit',
        'POST',
        {
          phoneNumber: '0982222007',
          idNumber: '001098000007',
          fullName: 'HACKED FULLNAME',
          dob: '1998-05-15',
          expiryDate: '2038-05-15',
          faceMatchScore: 95.0,
          password: 'Password@2026',
          onboardingId: refAuth.onboardingId,
        },
        refAuth.onboardingToken,
        SBX_REF
      )
    );
    expect(refSubmit.status).toBe(400);
    const refData = await refSubmit.json();
    expect(refData.responseCode).toBe('VAL-400');
  });

  // D08: Image Size Boundary
  it('D08: Exactly 100KB rejected in training; 5.1MB accepted in training', async () => {
    const trainAuth = await getOnboardingTokenForSandbox(SBX_TRAIN, '0981111008');
    const refAuth = await getOnboardingTokenForSandbox(SBX_REF, '0982222008');

    // 100KB test
    const train100KB = await processOcr(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ocr',
        'POST',
        { frontImageUrl: '/samples/size/100KB.jpg', backImageUrl: '/samples/P01_back.jpg' },
        trainAuth.onboardingToken,
        SBX_TRAIN
      )
    );
    expect(train100KB.status).toBe(400); // 100KB rejected in training

    const ref100KB = await processOcr(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ocr',
        'POST',
        { frontImageUrl: '/samples/size/100KB.jpg', backImageUrl: '/samples/P01_back.jpg' },
        refAuth.onboardingToken,
        SBX_REF
      )
    );
    expect(ref100KB.status).toBe(200); // 100KB accepted in reference

    // 5.1MB test
    const train5MB = await processOcr(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ocr',
        'POST',
        { frontImageUrl: '/samples/size/5_1MB.jpg', backImageUrl: '/samples/P01_back.jpg' },
        trainAuth.onboardingToken,
        SBX_TRAIN
      )
    );
    expect(train5MB.status).toBe(200); // 5.1MB accepted in training

    const ref5MB = await processOcr(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ocr',
        'POST',
        { frontImageUrl: '/samples/size/5_1MB.jpg', backImageUrl: '/samples/P01_back.jpg' },
        refAuth.onboardingToken,
        SBX_REF
      )
    );
    expect(ref5MB.status).toBe(400); // 5.1MB rejected in reference
  });

  // D09: Expiry Date Rules
  it('D09: Card expiring today accepted in training; "KHONG THOI HAN" crashes 500 in training', async () => {
    const trainAuth = await getOnboardingTokenForSandbox(SBX_TRAIN, '0981111009');
    const refAuth = await getOnboardingTokenForSandbox(SBX_REF, '0982222009');

    // P07 (expires today: 2026-11-23)
    const trainP07 = await processOcr(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ocr',
        'POST',
        { frontImageUrl: '/samples/P07_front.jpg', backImageUrl: '/samples/P07_back.jpg' },
        trainAuth.onboardingToken,
        SBX_TRAIN
      )
    );
    expect(trainP07.status).toBe(200); // accepted in training

    const refP07 = await processOcr(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ocr',
        'POST',
        { frontImageUrl: '/samples/P07_front.jpg', backImageUrl: '/samples/P07_back.jpg' },
        refAuth.onboardingToken,
        SBX_REF
      )
    );
    expect(refP07.status).toBe(400); // rejected with EKYC-01 in reference

    // P08 (KHONG THOI HAN)
    const trainP08 = await processOcr(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ocr',
        'POST',
        { frontImageUrl: '/samples/P08_front.jpg', backImageUrl: '/samples/P08_back.jpg' },
        trainAuth.onboardingToken,
        SBX_TRAIN
      )
    );
    expect(trainP08.status).toBe(500); // 500 crash in training

    const refP08 = await processOcr(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ocr',
        'POST',
        { frontImageUrl: '/samples/P08_front.jpg', backImageUrl: '/samples/P08_back.jpg' },
        refAuth.onboardingToken,
        SBX_REF
      )
    );
    expect(refP08.status).toBe(200); // accepted in reference
  });

  // D10: Phone Prefix at API Level
  it('D10: API accepts prefix 02 in training; rejects in reference', async () => {
    const trainOtp = await requestOtp(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/otp/request',
        'POST',
        { phoneNumber: '0212345678' },
        undefined,
        SBX_TRAIN
      )
    );
    expect(trainOtp.status).toBe(200); // training accepts any 10 digits

    const refOtp = await requestOtp(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/otp/request',
        'POST',
        { phoneNumber: '0212345678' },
        undefined,
        SBX_REF
      )
    );
    expect(refOtp.status).toBe(400); // reference rejects prefix 02
  });

  // D11: Consecutive Face Failure Lock Storage
  it('D11: 3 face failures does not lock DB session in training; locks in reference', async () => {
    const trainAuth = await getOnboardingTokenForSandbox(SBX_TRAIN, '0981111011');
    const refAuth = await getOnboardingTokenForSandbox(SBX_REF, '0982222011');

    // Fail 3 times in training
    for (let i = 0; i < 3; i++) {
      await checkFace(
        makeRequest(
          'http://localhost:3000/api/v1/onboarding/face-check',
          'POST',
          { selfieUrl: '/samples/S_liveness_fail.jpg' },
          trainAuth.onboardingToken,
          SBX_TRAIN
        )
      );
    }
    const trainSession = await db
      .select()
      .from(schema.onboardingSessions)
      .where(eq(schema.onboardingSessions.id, trainAuth.onboardingId));
    expect(trainSession[0].lockedUntil).toBeNull(); // not locked in server DB

    // Fail 3 times in reference
    for (let i = 0; i < 3; i++) {
      await checkFace(
        makeRequest(
          'http://localhost:3000/api/v1/onboarding/face-check',
          'POST',
          { selfieUrl: '/samples/S_liveness_fail.jpg' },
          refAuth.onboardingToken,
          SBX_REF
        )
      );
    }
    const refSession = await db
      .select()
      .from(schema.onboardingSessions)
      .where(eq(schema.onboardingSessions.id, refAuth.onboardingId));
    expect(refSession[0].lockedUntil).not.toBeNull(); // locked on server
  });

  // D12: OTP Resend Rules
  it('D12: 4th OTP resend allowed in training; rejected in reference', async () => {
    // Training
    const trainReq = makeRequest(
      'http://localhost:3000/api/v1/onboarding/otp/request',
      'POST',
      { phoneNumber: '0981111012' },
      undefined,
      SBX_TRAIN
    );
    const trainRes = await requestOtp(trainReq);
    const { onboardingId: trainId } = await trainRes.json();

    for (let i = 0; i < 3; i++) {
      await resendOtp(
        makeRequest(
          'http://localhost:3000/api/v1/onboarding/otp/resend',
          'POST',
          { onboardingId: trainId },
          undefined,
          SBX_TRAIN
        )
      );
    }
    const fourthTrain = await resendOtp(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/otp/resend',
        'POST',
        { onboardingId: trainId },
        undefined,
        SBX_TRAIN
      )
    );
    expect(fourthTrain.status).toBe(200); // 4th allowed in training

    // Reference
    const refReq = makeRequest(
      'http://localhost:3000/api/v1/onboarding/otp/request',
      'POST',
      { phoneNumber: '0982222012' },
      undefined,
      SBX_REF
    );
    const refRes = await requestOtp(refReq);
    const { onboardingId: refId } = await refRes.json();

    for (let i = 0; i < 3; i++) {
      await resendOtp(
        makeRequest(
          'http://localhost:3000/api/v1/onboarding/otp/resend',
          'POST',
          { onboardingId: refId },
          undefined,
          SBX_REF
        )
      );
    }
    const fourthRef = await resendOtp(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/otp/resend',
        'POST',
        { onboardingId: refId },
        undefined,
        SBX_REF
      )
    );
    expect(fourthRef.status).toBe(429); // 4th blocked in reference
  });

  // D13: Document Rejection HTTP Status Code
  it('D13: EKYC-01 returns HTTP 200 in training; HTTP 400 in reference', async () => {
    const trainAuth = await getOnboardingTokenForSandbox(SBX_TRAIN, '0981111013');
    const refAuth = await getOnboardingTokenForSandbox(SBX_REF, '0982222013');

    // Training: expired CCCD (P09) returns 200 with code EKYC-01
    const trainOcr = await processOcr(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ocr',
        'POST',
        { frontImageUrl: '/samples/P09_front.jpg', backImageUrl: '/samples/P09_back.jpg' },
        trainAuth.onboardingToken,
        SBX_TRAIN
      )
    );
    expect(trainOcr.status).toBe(200);
    const trainData = await trainOcr.json();
    expect(trainData.responseCode).toBe('EKYC-01');

    // Reference: expired CCCD (P09) returns 400 with code EKYC-01
    const refOcr = await processOcr(
      makeRequest(
        'http://localhost:3000/api/v1/onboarding/ocr',
        'POST',
        { frontImageUrl: '/samples/P09_front.jpg', backImageUrl: '/samples/P09_back.jpg' },
        refAuth.onboardingToken,
        SBX_REF
      )
    );
    expect(refOcr.status).toBe(400);
    const refData = await refOcr.json();
    expect(refData.responseCode).toBe('EKYC-01');
  });
});
