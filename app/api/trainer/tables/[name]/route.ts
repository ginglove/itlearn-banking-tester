import { NextRequest, NextResponse } from 'next/server';
import { isTrainerAuthorized } from '@/lib/trainer-auth';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  if (!(await isTrainerAuthorized(req))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await params;
  const url = new URL(req.url);
  const sandboxId = url.searchParams.get('sandboxId') || 'DEMO01';

  let rows: any[] = [];
  try {
    switch (name) {
      case 'customers':
        rows = await db
          .select()
          .from(schema.customers)
          .where(eq(schema.customers.sandboxId, sandboxId));
        break;
      case 'accounts':
        rows = await db
          .select()
          .from(schema.accounts)
          .where(eq(schema.accounts.sandboxId, sandboxId));
        break;
      case 'onboarding_sessions':
        rows = await db
          .select()
          .from(schema.onboardingSessions)
          .where(eq(schema.onboardingSessions.sandboxId, sandboxId))
          .orderBy(desc(schema.onboardingSessions.createdAt));
        break;
      case 'sms_outbox':
        rows = await db
          .select()
          .from(schema.smsOutbox)
          .where(eq(schema.smsOutbox.sandboxId, sandboxId))
          .orderBy(desc(schema.smsOutbox.sentAt))
          .limit(100);
        break;
      case 'phone_locks':
        rows = await db
          .select()
          .from(schema.phoneLocks)
          .where(eq(schema.phoneLocks.sandboxId, sandboxId));
        break;
      case 'settings':
        rows = await db
          .select()
          .from(schema.settings)
          .where(eq(schema.settings.sandboxId, sandboxId));
        break;
      default:
        return NextResponse.json(
          { message: `Bảng ${name} không hợp lệ hoặc không được phép xem` },
          { status: 400 }
        );
    }

    return NextResponse.json({ table: name, sandboxId, count: rows.length, rows });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
