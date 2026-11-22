import { NextRequest } from 'next/server';
import { db, schema } from '@/lib/db';
import { extractSandboxFromRequest } from '@/lib/sandbox';
import { getSandboxSettings } from '@/lib/settings';
import {
  faceScoreSource,
  allowIdentityOverride,
  validatePasswordCriteria,
  duplicateIdentityResponse,
  shouldCreateDuplicateRecordOnRetry,
} from '@/lib/core/policy';
import {
  generateRequestId,
  createErrorResponse,
  createSuccessResponse,
  authenticateOnboarding,
} from '@/lib/api-helper';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function generateCifNumber(): string {
  return `880${Math.floor(10000 + Math.random() * 90000).toString()}`;
}

function generateAccountNumber(): string {
  return `1903${Math.floor(100000000 + Math.random() * 900000000).toString()}`;
}

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

  // Simulated Core Banking outage
  if (settings.coreDown) {
    return createErrorResponse(
      req,
      requestId,
      'EKYC-99',
      'Hệ thống đang bận, vui lòng thử lại sau',
      500
    );
  }

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

  const {
    phoneNumber,
    idNumber,
    fullName,
    dob,
    expiryDate,
    faceMatchScore,
    email,
    address,
    password,
  } = body || {};

  // Validate mandatory fields
  if (!phoneNumber || !idNumber || !fullName || !dob || !expiryDate || faceMatchScore === undefined) {
    return createErrorResponse(
      req,
      requestId,
      'VAL-400',
      'Thiếu các trường thông tin bắt buộc theo đặc tả SRS',
      400,
      body
    );
  }

  // Look up session
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
  let ocrData: any = {};
  try {
    if (session.ocrJson) {
      ocrData = JSON.parse(session.ocrJson);
    }
  } catch {}

  // 1. Biometric verification score evaluation (D04)
  const scoreSource = faceScoreSource(settings.profile);
  if (scoreSource === 'session_record') {
    if (session.faceScore === null || session.faceScore < 85.0) {
      return createErrorResponse(
        req,
        requestId,
        'VAL-400',
        'Xác thực khuôn mặt chưa hoàn tất hoặc không đạt yêu cầu',
        400,
        body
      );
    }
    if (Number(faceMatchScore) !== Number(session.faceScore)) {
      return createErrorResponse(
        req,
        requestId,
        'VAL-400',
        'Điểm số so khớp khuôn mặt không khớp với kết quả kiểm tra',
        400,
        body
      );
    }
  }

  // 2. Identity parameter integrity check (3A, D07)
  if (!allowIdentityOverride(settings.profile)) {
    if (ocrData.fullName && fullName !== ocrData.fullName) {
      return createErrorResponse(
        req,
        requestId,
        'VAL-400',
        'Họ và tên không được phép thay đổi so với dữ liệu OCR',
        400,
        body
      );
    }
    if (ocrData.dob && dob !== ocrData.dob) {
      return createErrorResponse(
        req,
        requestId,
        'VAL-400',
        'Ngày sinh không được phép thay đổi so với dữ liệu OCR',
        400,
        body
      );
    }
  }

  // 3. Password policy validation (B5, D03)
  const passwordResult = validatePasswordCriteria(
    password || '',
    phoneNumber,
    dob,
    settings.profile
  );
  if (!passwordResult.isValid) {
    return createErrorResponse(
      req,
      requestId,
      'VAL-400',
      passwordResult.message || 'Mật khẩu không đáp ứng chính sách bảo mật',
      400,
      body
    );
  }

  // 4. Duplicate CCCD check and Flow 6A handling (BR-105, D05, D06)
  const existingCustomers = await db
    .select()
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.sandboxId, sandboxId),
        eq(schema.customers.idNumber, idNumber)
      )
    );

  // If this session previously committed a CIF (Flow 6A retry)
  if (session.cifNumber) {
    const isRetryDuplicateAllowed = shouldCreateDuplicateRecordOnRetry(settings.profile);

    if (!isRetryDuplicateAllowed) {
      // Idempotent recovery (Reference behaviour): return existing account
      const existingAccount = await db
        .select()
        .from(schema.accounts)
        .where(
          and(
            eq(schema.accounts.sandboxId, sandboxId),
            eq(schema.accounts.cifNumber, session.cifNumber)
          )
        )
        .limit(1);

      return createSuccessResponse(
        req,
        requestId,
        {
          responseCode: '00',
          message: 'Khoi tao tai khoan thanh cong',
          data: {
            cifNumber: session.cifNumber,
            accountNumber: existingAccount[0]?.accountNumber || '1903456789012',
            status: 'ACTIVE',
          },
        },
        200,
        body
      );
    }
    // Else in training mode with dropAfterCoreCommit, continues to create a duplicate CIF below (D06)
  } else if (existingCustomers.length > 0) {
    // Existing customer found and not from this in-progress session
    const dupRes = duplicateIdentityResponse(settings.profile);
    return createErrorResponse(
      req,
      requestId,
      dupRes.responseCode,
      dupRes.message,
      dupRes.httpStatus,
      body
    );
  }

  // 5. Generate identifiers
  const newCifNumber = generateCifNumber();
  const newAccountNumber = generateAccountNumber();

  // Create customer and account in Core Banking
  await db.insert(schema.customers).values({
    sandboxId,
    cifNumber: newCifNumber,
    idNumber,
    fullName,
    dob,
    expiryDate,
    phoneNumber,
    email: email || session.email || null,
    address: address || ocrData.address || null,
    passwordHash: password ? `hash_${password}` : null,
  });

  await db.insert(schema.accounts).values({
    sandboxId,
    accountNumber: newAccountNumber,
    cifNumber: newCifNumber,
    product: 'CASA',
    status: 'ACTIVE',
    balance: 0,
  });

  await db
    .update(schema.onboardingSessions)
    .set({
      cifNumber: newCifNumber,
      status: 'COMPLETED',
    })
    .where(eq(schema.onboardingSessions.id, payload.onboardingId));

  // 6. Network Drop Simulation (Flow 6A, D06)
  if (settings.dropAfterCoreCommit) {
    // Simulates connection timeout / network drop after Core has committed
    return createErrorResponse(
      req,
      requestId,
      'EKYC-99',
      'Hệ thống đang bận, vui lòng thử lại sau',
      500,
      body
    );
  }

  // 7. Success response exactly matching SRS Section 5
  return createSuccessResponse(
    req,
    requestId,
    {
      responseCode: '00',
      message: 'Khoi tao tai khoan thanh cong',
      data: {
        cifNumber: newCifNumber,
        accountNumber: newAccountNumber,
        status: 'ACTIVE',
      },
    },
    200,
    body
  );
}
