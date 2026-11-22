import { NextRequest, NextResponse } from 'next/server';
import { isTrainerAuthorized } from '@/lib/trainer-auth';
import { setSandboxSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  if (!(await isTrainerAuthorized(req))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const { sandboxId = 'DEMO01', dropAfterCoreCommit, coreDown } = body || {};

  await setSandboxSettings(sandboxId, {
    ...(dropAfterCoreCommit !== undefined ? { dropAfterCoreCommit } : {}),
    ...(coreDown !== undefined ? { coreDown } : {}),
  });

  return NextResponse.json({
    message: `Đã cập nhật cấu hình giả lập mạng cho sandbox ${sandboxId}`,
    sandboxId,
    dropAfterCoreCommit,
    coreDown,
  });
}
