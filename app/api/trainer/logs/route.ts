import { NextRequest, NextResponse } from 'next/server';
import { isTrainerAuthorized } from '@/lib/trainer-auth';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await isTrainerAuthorized(req))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const sandboxId = url.searchParams.get('sandboxId') || 'DEMO01';
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);

  try {
    const logs = await db
      .select()
      .from(schema.apiLogs)
      .where(eq(schema.apiLogs.sandboxId, sandboxId))
      .orderBy(desc(schema.apiLogs.at))
      .limit(limit);

    return NextResponse.json({ sandboxId, count: logs.length, logs });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
