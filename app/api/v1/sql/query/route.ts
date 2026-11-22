import { NextRequest, NextResponse } from 'next/server';
import { extractSandboxFromRequest } from '@/lib/sandbox';
import { executeLearnerQuery, validateLearnerSql } from '@/lib/sql-runner';
import { generateRequestId } from '@/lib/api-helper';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const sandboxId = extractSandboxFromRequest(req);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { responseCode: 'VAL-400', message: 'Định dạng JSON không hợp lệ', requestId },
      { status: 400, headers: { 'X-Request-Id': requestId } }
    );
  }

  const { sql } = body || {};

  if (!sql) {
    return NextResponse.json(
      { responseCode: 'VAL-400', message: 'Câu lệnh sql là bắt buộc', requestId },
      { status: 400, headers: { 'X-Request-Id': requestId } }
    );
  }

  const validation = validateLearnerSql(sql);
  if (!validation.isValid) {
    return NextResponse.json(
      { responseCode: 'VAL-400', message: validation.error, requestId },
      { status: 400, headers: { 'X-Request-Id': requestId } }
    );
  }

  try {
    const result = await executeLearnerQuery(sql, sandboxId);
    return NextResponse.json(
      {
        responseCode: '00',
        message: 'Thực thi câu lệnh thành công',
        data: result,
        requestId,
      },
      { status: 200, headers: { 'X-Request-Id': requestId } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { responseCode: 'SQL-500', message: err.message, requestId },
      { status: 400, headers: { 'X-Request-Id': requestId } }
    );
  }
}
