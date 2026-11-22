import { NextResponse } from 'next/server';
import { db, schema } from './db';
import { extractSandboxFromRequest } from './sandbox';
import { verifyOnboardingToken, OnboardingPayload } from './auth';

export interface ApiErrorResponse {
  responseCode: string;
  message: string;
  requestId: string;
  details?: any[];
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Mask sensitive credentials before logging
 */
export function maskSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const clone = Array.isArray(data) ? [...data] : { ...data };
  for (const key of Object.keys(clone)) {
    if (['password', 'passwordHash', 'otp', 'otpHash'].includes(key)) {
      clone[key] = '******';
    } else if (typeof clone[key] === 'object') {
      clone[key] = maskSensitiveData(clone[key]);
    }
  }
  return clone;
}

/**
 * Log API call asynchronously to api_logs
 */
export async function logApiCall(
  sandboxId: string,
  requestId: string,
  method: string,
  path: string,
  status: number,
  requestBody: any,
  responseBody: any
): Promise<void> {
  try {
    const maskedReq = maskSensitiveData(requestBody);
    const maskedRes = maskSensitiveData(responseBody);
    await db.insert(schema.apiLogs).values({
      sandboxId,
      requestId,
      method,
      path,
      status,
      requestJson: maskedReq ? JSON.stringify(maskedReq) : null,
      responseJson: maskedRes ? JSON.stringify(maskedRes) : null,
    });
  } catch (err) {
    console.error('Failed to log API call:', err);
  }
}

/**
 * Build error response with proper headers and logging
 */
export async function createErrorResponse(
  req: Request,
  requestId: string,
  responseCode: string,
  message: string,
  status: number,
  requestPayload?: any,
  details?: any[]
): Promise<NextResponse> {
  const sandboxId = extractSandboxFromRequest(req);
  const errorBody: ApiErrorResponse = {
    responseCode,
    message,
    requestId,
    ...(details ? { details } : {}),
  };

  await logApiCall(sandboxId, requestId, req.method, new URL(req.url).pathname, status, requestPayload, errorBody);

  return NextResponse.json(errorBody, {
    status,
    headers: {
      'X-Request-Id': requestId,
    },
  });
}

/**
 * Build success response with proper headers and logging
 */
export async function createSuccessResponse(
  req: Request,
  requestId: string,
  data: any,
  status = 200,
  requestPayload?: any
): Promise<NextResponse> {
  const sandboxId = extractSandboxFromRequest(req);
  await logApiCall(sandboxId, requestId, req.method, new URL(req.url).pathname, status, requestPayload, data);

  return NextResponse.json(data, {
    status,
    headers: {
      'X-Request-Id': requestId,
    },
  });
}

/**
 * Authenticate Onboarding Bearer Token from Request
 */
export async function authenticateOnboarding(
  req: Request
): Promise<OnboardingPayload | null> {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  return await verifyOnboardingToken(token);
}
