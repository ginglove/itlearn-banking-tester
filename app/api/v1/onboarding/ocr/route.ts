import { NextRequest } from 'next/server';
import { db, schema } from '@/lib/db';
import { extractSandboxFromRequest } from '@/lib/sandbox';
import { getSandboxSettings } from '@/lib/settings';
import {
  evaluateImageSize,
  evaluateDocumentExpiry,
  evaluateAge,
  documentRejectionStatusCode,
} from '@/lib/core/policy';
import {
  generateRequestId,
  createErrorResponse,
  createSuccessResponse,
  authenticateOnboarding,
} from '@/lib/api-helper';
import { resolvePersonaFromUrl } from '@/lib/modules/personas';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getUrlByteSize(urlStr: string): number {
  // 1. Check size samples explicitly by filename
  if (urlStr.includes('99KB') || urlStr.includes('99kb')) return 99 * 1024;
  if (urlStr.includes('100KB') || urlStr.includes('100kb')) return 100 * 1024;
  if (urlStr.includes('101KB') || urlStr.includes('101kb')) return 101 * 1024;
  if (urlStr.includes('5_1MB') || urlStr.includes('5.1MB') || urlStr.includes('5_1mb'))
    return Math.floor(5.1 * 1024 * 1024);
  if (urlStr.includes('5MB') || urlStr.includes('5mb')) return 5 * 1024 * 1024;

  // 2. Local public file check
  if (urlStr.startsWith('/') || urlStr.includes('/samples/')) {
    const cleanPath = urlStr.replace(/^https?:\/\/[^\/]+/, '');
    const localFilePath = path.join(process.cwd(), 'public', cleanPath);
    if (fs.existsSync(localFilePath)) {
      try {
        return fs.statSync(localFilePath).size;
      } catch {}
    }
  }

  // Default normal file size for mock/persona cards: 350 KB
  return 350 * 1024;
}

function isValidHost(urlStr: string): boolean {
  if (urlStr.startsWith('/') || urlStr.startsWith('./')) return true;
  try {
    const parsed = new URL(urlStr);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return true;
    if (parsed.hostname.endsWith('.vercel-storage.com')) return true;
    if (parsed.hostname.endsWith('.vercel.app')) return true;
  } catch {}
  return false;
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

  const { frontImageUrl, backImageUrl } = body || {};

  if (!frontImageUrl || !backImageUrl) {
    return createErrorResponse(
      req,
      requestId,
      'VAL-400',
      'frontImageUrl và backImageUrl là bắt buộc',
      400,
      body
    );
  }

  // SSRF check: allow own origin, /samples/* or *.public.blob.vercel-storage.com
  if (!isValidHost(frontImageUrl) || !isValidHost(backImageUrl)) {
    return createErrorResponse(
      req,
      requestId,
      'VAL-400',
      'Đường dẫn ảnh không được chấp nhận',
      400,
      body
    );
  }

  // Image size boundary validation (BR-102 & D08)
  const frontSize = getUrlByteSize(frontImageUrl);
  const backSize = getUrlByteSize(backImageUrl);

  const frontValidation = evaluateImageSize(frontSize, settings.profile);
  if (!frontValidation.isValid) {
    return createErrorResponse(
      req,
      requestId,
      'EKYC-01',
      frontValidation.message || 'Dung lượng ảnh mặt trước không hợp lệ (100KB - 5MB)',
      400,
      body
    );
  }

  const backValidation = evaluateImageSize(backSize, settings.profile);
  if (!backValidation.isValid) {
    return createErrorResponse(
      req,
      requestId,
      'EKYC-01',
      backValidation.message || 'Dung lượng ảnh mặt sau không hợp lệ (100KB - 5MB)',
      400,
      body
    );
  }

  // Resolve persona data
  const persona = resolvePersonaFromUrl(frontImageUrl);

  // Document expiry validation (BR-102, D09, D13)
  const expiryEval = evaluateDocumentExpiry(persona.expiryDate, settings.today, settings.profile);

  if (expiryEval.triggerSystemException) {
    // System simulation for unhandled expiry format in training mode
    return createErrorResponse(
      req,
      requestId,
      'EKYC-99',
      'Hệ thống đang bận, vui lòng thử lại sau',
      500,
      body
    );
  }

  if (!expiryEval.isValid) {
    const statusCode = documentRejectionStatusCode(settings.profile);
    return createErrorResponse(
      req,
      requestId,
      'EKYC-01',
      'Giấy tờ không hợp lệ hoặc đã hết hạn',
      statusCode,
      body
    );
  }

  // Age eligibility verification (BR-101, D02)
  const ageEval = evaluateAge(persona.dob, settings.today, settings.profile);
  if (!ageEval.isEligible) {
    return createErrorResponse(
      req,
      requestId,
      'EKYC-04',
      'Khách hàng chưa đủ 18 tuổi',
      400,
      body
    );
  }

  // Save OCR result in session
  const ocrData = {
    idNumber: persona.idNumber,
    fullName: persona.fullName,
    dob: persona.dob,
    expiryDate: persona.expiryDate,
    address: persona.address,
  };

  await db
    .update(schema.onboardingSessions)
    .set({
      ocrJson: JSON.stringify(ocrData),
      status: 'OCR_COMPLETED',
    })
    .where(eq(schema.onboardingSessions.id, payload.onboardingId));

  return createSuccessResponse(req, requestId, ocrData, 200, body);
}
