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

  const { sandboxId = 'DEMO01', profile } = body || {};

  if (!['training', 'reference'].includes(profile)) {
    return NextResponse.json(
      { message: 'Profile phải là "training" hoặc "reference"' },
      { status: 400 }
    );
  }

  await setSandboxSettings(sandboxId, { profile });

  return NextResponse.json({
    message: `Đã chuyển đổi profile sang "${profile}" cho sandbox ${sandboxId}`,
    sandboxId,
    profile,
  });
}
