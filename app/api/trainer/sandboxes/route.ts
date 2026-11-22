import { NextRequest, NextResponse } from 'next/server';
import { isTrainerAuthorized } from '@/lib/trainer-auth';
import { db, schema } from '@/lib/db';
import { seedSandbox } from '@/db/seed';
import { getSandboxSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await isTrainerAuthorized(req))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const sandboxes = await db.select().from(schema.sandboxes);
  const result = await Promise.all(
    sandboxes.map(async (sb: any) => {
      const settings = await getSandboxSettings(sb.id);
      return {
        ...sb,
        settings,
      };
    })
  );

  return NextResponse.json({ sandboxes: result });
}

export async function POST(req: NextRequest) {
  if (!(await isTrainerAuthorized(req))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const { name, code } = body || {};

  if (!name || !code) {
    return NextResponse.json({ message: 'Tên và mã sandbox là bắt buộc' }, { status: 400 });
  }

  const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (cleanCode.length < 3 || cleanCode.length > 10) {
    return NextResponse.json(
      { message: 'Mã sandbox phải từ 3 đến 10 ký tự chữ và số' },
      { status: 400 }
    );
  }

  await seedSandbox(cleanCode, name);

  return NextResponse.json({
    message: 'Tạo sandbox thành công',
    sandbox: {
      id: cleanCode,
      code: cleanCode,
      name,
    },
  });
}
