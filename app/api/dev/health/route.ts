import { NextResponse } from 'next/server';
import { getSimulatedDate } from '@/lib/clock';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    profile: 'hidden',
    today: getSimulatedDate(),
    version: '1.0.0',
    system: 'NeoBank Digital Banking SIT',
  });
}
