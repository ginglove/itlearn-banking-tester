import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { verifyOnboardingToken } from '@/lib/auth';
import { extractSandboxFromRequest } from '@/lib/sandbox';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Authenticate bearer token from clientPayload or authorization header
        const authHeader = request.headers.get('authorization') || '';
        let token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
        if (!token && clientPayload) {
          try {
            const parsed = JSON.parse(clientPayload);
            token = parsed.token || '';
          } catch {}
        }

        const payload = token ? await verifyOnboardingToken(token) : null;
        if (!payload) {
          throw new Error('Unauthorized upload request');
        }

        const sandboxId = extractSandboxFromRequest(request);

        return {
          allowedContentTypes: ['image/jpeg', 'image/png'],
          maximumSizeInBytes: 6 * 1024 * 1024, // 6 MB
          tokenPayload: JSON.stringify({
            sandboxId,
            onboardingId: payload.onboardingId,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Blob upload completed:', blob.url, tokenPayload);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 } // Bad Request
    );
  }
}
