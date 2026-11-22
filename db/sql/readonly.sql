-- =============================================================================
-- NeoBank eKYC — Learner Readonly Role & Secure Schema Views
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS learner;

-- Secure Views filtered by current_setting('app.sandbox_id', true)
CREATE OR REPLACE VIEW learner.customers AS
    SELECT cif_number, id_number, full_name, dob, expiry_date, phone_number, email, address, created_at
    FROM public.customers
    WHERE sandbox_id = current_setting('app.sandbox_id', true);

CREATE OR REPLACE VIEW learner.accounts AS
    SELECT account_number, cif_number, product, status, balance, opened_at
    FROM public.accounts
    WHERE sandbox_id = current_setting('app.sandbox_id', true);

CREATE OR REPLACE VIEW learner.onboarding_sessions AS
    SELECT id, phone_number, email, status, otp_expires_at, otp_wrong_count, otp_resend_count,
           face_fail_count, locked_until, ocr_json, face_score, cif_number, created_at
    FROM public.onboarding_sessions
    WHERE sandbox_id = current_setting('app.sandbox_id', true);

CREATE OR REPLACE VIEW learner.sms_outbox AS
    SELECT id, phone_number, content, sent_at
    FROM public.sms_outbox
    WHERE sandbox_id = current_setting('app.sandbox_id', true);

CREATE OR REPLACE VIEW learner.api_logs AS
    SELECT id, request_id, method, path, status, request_json, response_json, at
    FROM public.api_logs
    WHERE sandbox_id = current_setting('app.sandbox_id', true);

-- Create ekyc_readonly login role if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ekyc_readonly') THEN
        CREATE ROLE ekyc_readonly WITH LOGIN PASSWORD 'readonly_password_secret_24_chars_min';
    END IF;
END
$$;

-- Grant permissions exclusively to schema learner
GRANT USAGE ON SCHEMA learner TO ekyc_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA learner TO ekyc_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA learner GRANT SELECT ON TABLES TO ekyc_readonly;
