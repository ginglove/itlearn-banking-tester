import { cookies, headers } from 'next/headers';

export const DEFAULT_SANDBOX_ID = 'DEMO01';

/**
 * Normalizes sandbox ID to 6 alphanumeric characters uppercase
 */
export function normalizeSandboxId(code?: string | null): string {
  if (!code) return DEFAULT_SANDBOX_ID;
  const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  return cleaned || DEFAULT_SANDBOX_ID;
}

/**
 * Resolve the current request's sandbox ID from Next.js request context:
 * 1. Header `X-Sandbox-Id` (Postman / API tests)
 * 2. Cookie `sbx` (Browser sessions via ?s=CODE)
 * 3. Fallback `DEMO01`
 */
export async function getSandboxId(): Promise<string> {
  try {
    const headerList = await headers();
    const headerSandbox = headerList.get('x-sandbox-id');
    if (headerSandbox) {
      return normalizeSandboxId(headerSandbox);
    }

    const cookieStore = await cookies();
    const cookieSandbox = cookieStore.get('sbx')?.value;
    if (cookieSandbox) {
      return normalizeSandboxId(cookieSandbox);
    }
  } catch {
    // If called outside of request context
  }

  return DEFAULT_SANDBOX_ID;
}

/**
 * Extract sandbox ID directly from Request headers/cookies (for Route Handlers)
 */
export function extractSandboxFromRequest(req: Request): string {
  const headerSandbox = req.headers.get('x-sandbox-id');
  if (headerSandbox) {
    return normalizeSandboxId(headerSandbox);
  }

  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)sbx=([^;]+)/);
  if (match && match[1]) {
    return normalizeSandboxId(decodeURIComponent(match[1]));
  }

  return DEFAULT_SANDBOX_ID;
}
