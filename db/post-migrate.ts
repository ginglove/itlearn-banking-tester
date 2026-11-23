import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { seedSandbox } from './seed';

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/neobank_ekyc';

const readonlyPassword = process.env.READONLY_DB_PASSWORD || 'readonly_secret_password_24_chars_min';

async function postMigrate() {
  console.log('[post-migrate] Starting post-migration setup...');
  const isSsl =
    connectionString.includes('neon.tech') ||
    connectionString.includes('sslmode=require') ||
    connectionString.includes('ssl=true');

  const pool = new Pool({
    connectionString,
    ssl: isSsl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    // 1. Create or update ekyc_readonly role
    try {
      console.log('[post-migrate] Configuring ekyc_readonly role...');
      const roleCheck = await pool.query(
        "SELECT 1 FROM pg_roles WHERE rolname = 'ekyc_readonly'"
      );
      if (roleCheck.rows.length === 0) {
        await pool.query(
          `CREATE ROLE ekyc_readonly WITH LOGIN PASSWORD '${readonlyPassword}';`
        );
        console.log('[post-migrate] Role ekyc_readonly created.');
      } else {
        await pool.query(
          `ALTER ROLE ekyc_readonly WITH PASSWORD '${readonlyPassword}';`
        );
        console.log('[post-migrate] Role ekyc_readonly password updated.');
      }
    } catch (err: any) {
      console.warn('[post-migrate] Role creation notice:', err.message);
    }

    // 2. Create learner schema and sandboxed views
    console.log('[post-migrate] Creating learner schema and views...');
    await pool.query('CREATE SCHEMA IF NOT EXISTS learner;');

    // Drop and recreate views to ensure latest schema
    const views = [
      `CREATE OR REPLACE VIEW learner.customers AS
        SELECT cif_number, id_number, full_name, dob, expiry_date, phone_number, email, address, created_at
        FROM public.customers
        WHERE sandbox_id = current_setting('app.sandbox_id', true);`,

      `CREATE OR REPLACE VIEW learner.accounts AS
        SELECT account_number, cif_number, product, status, balance, opened_at
        FROM public.accounts
        WHERE sandbox_id = current_setting('app.sandbox_id', true);`,

      `CREATE OR REPLACE VIEW learner.onboarding_sessions AS
        SELECT id, phone_number, email, status, otp_expires_at, otp_wrong_count, otp_resend_count,
               face_fail_count, locked_until, ocr_json, face_score, cif_number, created_at
        FROM public.onboarding_sessions
        WHERE sandbox_id = current_setting('app.sandbox_id', true);`,

      `CREATE OR REPLACE VIEW learner.sms_outbox AS
        SELECT id, phone_number, content, sent_at
        FROM public.sms_outbox
        WHERE sandbox_id = current_setting('app.sandbox_id', true);`,

      `CREATE OR REPLACE VIEW learner.api_logs AS
        SELECT id, request_id, method, path, status, request_json, response_json, at
        FROM public.api_logs
        WHERE sandbox_id = current_setting('app.sandbox_id', true);`,
    ];

    for (const v of views) {
      await pool.query(v);
    }

    // 3. Grant permissions to ekyc_readonly
    try {
      await pool.query('GRANT USAGE ON SCHEMA learner TO ekyc_readonly;');
      await pool.query('GRANT SELECT ON ALL TABLES IN SCHEMA learner TO ekyc_readonly;');
      await pool.query('ALTER DEFAULT PRIVILEGES IN SCHEMA learner GRANT SELECT ON TABLES TO ekyc_readonly;');
      console.log('[post-migrate] Permissions granted to ekyc_readonly.');
    } catch (err: any) {
      console.warn('[post-migrate] Grant permissions notice:', err.message);
    }

    // 4. Seed default sandbox DEMO01
    console.log('[post-migrate] Seeding DEMO01 sandbox...');
    await seedSandbox('DEMO01', 'Demo Sandbox (Khóa học)');
    console.log('[post-migrate] ✓ Post-migration finished successfully.');
  } finally {
    await pool.end();
  }
}

postMigrate().catch((err) => {
  console.error('[post-migrate] Failed:', err);
  process.exit(1);
});
