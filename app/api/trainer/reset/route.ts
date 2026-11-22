import { NextRequest, NextResponse } from 'next/server';
import { isTrainerAuthorized } from '@/lib/trainer-auth';
import { seedSandbox } from '@/db/seed';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await isTrainerAuthorized(req))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const sandboxId = body.sandboxId || 'DEMO01';
  const startTime = Date.now();

  try {
    await seedSandbox(sandboxId);
    const durationMs = Date.now() - startTime;
    return NextResponse.json({
      message: `Khôi phục dữ liệu sandbox ${sandboxId} thành công`,
      durationMs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: `Lỗi khôi phục: ${err.message}` },
      { status: 500 }
    );
  }
}
