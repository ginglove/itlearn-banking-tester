import { Pool } from 'pg';
import { env } from './config';

const readonlyPassword = env.READONLY_DB_PASSWORD;

function getReadonlyConnectionString(): string {
  const base = env.DATABASE_URL;
  try {
    const url = new URL(base);
    url.username = 'ekyc_readonly';
    url.password = readonlyPassword;
    return url.toString();
  } catch {
    return base;
  }
}

export interface SqlQueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  durationMs: number;
}

export function validateLearnerSql(sql: string): { isValid: boolean; error?: string } {
  const trimmed = sql.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Câu lệnh SQL không được để trống' };
  }

  // Reject chained statements with semicolons
  if (trimmed.includes(';')) {
    // Only allow single trailing semicolon
    if (trimmed.indexOf(';') !== trimmed.length - 1) {
      return { isValid: false, error: 'Chỉ chấp nhận một câu lệnh SQL duy nhất (không dùng dấu chấm phẩy phân tách nhiều lệnh)' };
    }
  }

  const cleanSql = trimmed.replace(/;$/, '').trim();

  // Must begin with SELECT
  if (!/^SELECT\s+/i.test(cleanSql)) {
    return { isValid: false, error: 'Chỉ cho phép thực thi câu lệnh truy vấn dữ liệu (SELECT)' };
  }

  // Check denylist words
  const denylist = [
    'insert',
    'update',
    'delete',
    'drop',
    'alter',
    'truncate',
    'create',
    'set_config',
    'current_setting',
    'pg_',
    'dblink',
    'copy',
    'grant',
    'revoke',
    'execute',
  ];

  const lower = cleanSql.toLowerCase();
  for (const word of denylist) {
    // Check word boundary
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower)) {
      return { isValid: false, error: `Từ khóa '${word}' không được phép sử dụng trong môi trường học viên` };
    }
  }

  return { isValid: true };
}

export async function executeLearnerQuery(
  sql: string,
  sandboxId: string
): Promise<SqlQueryResult> {
  const validation = validateLearnerSql(sql);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Câu lệnh SQL không hợp lệ');
  }

  const cleanSql = sql.trim().replace(/;$/, '').trim();
  const startTime = Date.now();

  let pool: Pool;
  try {
    pool = new Pool({
      connectionString: getReadonlyConnectionString(),
      max: 2,
      connectionTimeoutMillis: 3000,
    });
  } catch {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 2,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY;');
    await client.query("SET LOCAL statement_timeout = '3s';");
    await client.query('SELECT set_config($1, $2, true);', ['app.sandbox_id', sandboxId]);
    await client.query('SET LOCAL search_path = learner;');

    // Wrap query with limit 200
    const limitedSql = `SELECT * FROM (${cleanSql}) AS _subquery LIMIT 200;`;
    const result = await client.query(limitedSql);
    await client.query('COMMIT;');

    const durationMs = Date.now() - startTime;

    return {
      columns: result.fields ? result.fields.map((f) => f.name) : [],
      rows: result.rows || [],
      rowCount: result.rowCount || 0,
      durationMs,
    };
  } catch (err: any) {
    try {
      await client.query('ROLLBACK;');
    } catch {}
    throw new Error(`Lỗi thực thi SQL: ${err.message}`);
  } finally {
    client.release();
    await pool.end();
  }
}
