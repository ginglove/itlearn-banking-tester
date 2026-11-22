import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { extractSandboxFromRequest } from '@/lib/sandbox';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const phone = url.searchParams.get('phone');
  const sandboxId = extractSandboxFromRequest(req);

  try {
    let query = db
      .select()
      .from(schema.smsOutbox)
      .where(eq(schema.smsOutbox.sandboxId, sandboxId))
      .orderBy(desc(schema.smsOutbox.sentAt))
      .limit(20);

    const messages = await query;
    const filtered = phone ? messages.filter((m: any) => m.phoneNumber === phone) : messages;

    return NextResponse.json({
      status: 'ok',
      messages: filtered,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', message: err.message },
      { status: 500 }
    );
  }
}
