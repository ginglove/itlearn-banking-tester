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

  const { sandboxId = 'DEMO01', today } = body || {};

  if (!today || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    return NextResponse.json(
      { message: 'Định dạng ngày không hợp lệ (yêu cầu YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  await setSandboxSettings(sandboxId, { today });

  return NextResponse.json({
    message: `Đã cập nhật ngày hệ thống thành ${today} cho sandbox ${sandboxId}`,
    sandboxId,
    today,
  });
}
