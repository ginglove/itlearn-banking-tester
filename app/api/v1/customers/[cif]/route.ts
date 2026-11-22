import { NextRequest } from 'next/server';
import { db, schema } from '@/lib/db';
import { extractSandboxFromRequest } from '@/lib/sandbox';
import {
  generateRequestId,
  createErrorResponse,
  createSuccessResponse,
  authenticateOnboarding,
} from '@/lib/api-helper';
import { verifyTrainerToken } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cif: string }> }
) {
  const requestId = generateRequestId();
  const { cif } = await params;
  const sandboxId = extractSandboxFromRequest(req);

  // Authenticate either onboarding bearer token or trainer token or trainer PIN
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  const trainerPin = req.headers.get('x-trainer-pin');

  const onboardingAuth = token ? await authenticateOnboarding(req) : null;
  const trainerAuth = token ? await verifyTrainerToken(token) : null;

  if (!onboardingAuth && !trainerAuth && !trainerPin) {
    return createErrorResponse(
      req,
      requestId,
      'AUTH-401',
      'Yêu cầu xác thực tài khoản để truy vấn',
      401
    );
  }

  const customerRows = await db
    .select({
      cifNumber: schema.customers.cifNumber,
      idNumber: schema.customers.idNumber,
      fullName: schema.customers.fullName,
      dob: schema.customers.dob,
      expiryDate: schema.customers.expiryDate,
      phoneNumber: schema.customers.phoneNumber,
      email: schema.customers.email,
      address: schema.customers.address,
      createdAt: schema.customers.createdAt,
    })
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.sandboxId, sandboxId),
        eq(schema.customers.cifNumber, cif)
      )
    )
    .limit(1);

  if (customerRows.length === 0) {
    return createErrorResponse(
      req,
      requestId,
      'VAL-400',
      'Không tìm thấy khách hàng với mã CIF đã cho',
      404
    );
  }

  const customer = customerRows[0];

  const accounts = await db
    .select({
      accountNumber: schema.accounts.accountNumber,
      product: schema.accounts.product,
      status: schema.accounts.status,
      balance: schema.accounts.balance,
      openedAt: schema.accounts.openedAt,
    })
    .from(schema.accounts)
    .where(
      and(
        eq(schema.accounts.sandboxId, sandboxId),
        eq(schema.accounts.cifNumber, cif)
      )
    );

  return createSuccessResponse(
    req,
    requestId,
    {
      customer,
      accounts,
    },
    200
  );
}
