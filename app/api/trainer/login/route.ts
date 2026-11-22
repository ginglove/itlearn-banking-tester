import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/config';
import { signTrainerToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const { pin } = body || {};

  if (!pin || pin !== env.TRAINER_PIN) {
    return NextResponse.json({ message: 'Mã PIN giảng viên không chính xác' }, { status: 401 });
  }

  const token = await signTrainerToken({ role: 'trainer' });
  const response = NextResponse.json({ message: 'Đăng nhập thành công', token });

  response.cookies.set('trainer_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60, // 8 hours
    path: '/',
  });

  return response;
}
