-- =============================================================================
-- NeoBank eKYC Digital Banking — Database Initialization Script
-- Target: PostgreSQL 14+ / Neon Postgres
-- Purpose: Initialize database structure (tables, constraints, views, roles) 
--          and seed default test data (DEMO01 sandbox, customers, accounts, settings).
-- Usage: psql -U <user> -d <database> -f db/init.sql
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. BASE TABLES (SCHEMA: public)
-- -----------------------------------------------------------------------------

-- 1.1 Sandboxes Table
CREATE TABLE IF NOT EXISTS public.sandboxes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 Sandbox Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    sandbox_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    CONSTRAINT settings_sandbox_id_key_pk PRIMARY KEY (sandbox_id, key)
);

-- 1.3 Core Banking Customers Table
-- Note: id_number deliberately has NO unique constraint at DB level 
-- (Uniqueness per sandbox is enforced in application code based on active profile)
CREATE TABLE IF NOT EXISTS public.customers (
    sandbox_id TEXT NOT NULL,
    cif_number TEXT NOT NULL,
    id_number TEXT NOT NULL,
    full_name TEXT NOT NULL,
    dob TEXT NOT NULL,                 -- ISO format: YYYY-MM-DD
    expiry_date TEXT NOT NULL,         -- ISO format: YYYY-MM-DD or 'KHONG THOI HAN'
    phone_number TEXT NOT NULL,
    email TEXT,
    address TEXT,
    password_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT customers_sandbox_id_cif_number_pk PRIMARY KEY (sandbox_id, cif_number)
);

-- 1.4 CASA Payment Accounts Table
CREATE TABLE IF NOT EXISTS public.accounts (
    sandbox_id TEXT NOT NULL,
    account_number TEXT NOT NULL,
    cif_number TEXT NOT NULL,
    product TEXT NOT NULL DEFAULT 'CASA',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    balance BIGINT NOT NULL DEFAULT 0, -- VND integer
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT accounts_sandbox_id_account_number_pk PRIMARY KEY (sandbox_id, account_number)
);

-- 1.5 eKYC Onboarding Sessions Table
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
    id TEXT PRIMARY KEY,
    sandbox_id TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'INIT',
    otp_hash TEXT,
    otp_expires_at TIMESTAMPTZ,
    otp_wrong_count INTEGER NOT NULL DEFAULT 0,
    otp_resend_count INTEGER NOT NULL DEFAULT 0,
    face_fail_count INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    ocr_json TEXT,
    face_score REAL,
    cif_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.6 Phone Number Lock Table (BR-104: 24h Lockout)
CREATE TABLE IF NOT EXISTS public.phone_locks (
    sandbox_id TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    locked_until TIMESTAMPTZ NOT NULL,
    CONSTRAINT phone_locks_sandbox_id_phone_number_pk PRIMARY KEY (sandbox_id, phone_number)
);

-- 1.7 SMS Outbox Simulator Table
CREATE TABLE IF NOT EXISTS public.sms_outbox (
    id SERIAL PRIMARY KEY,
    sandbox_id TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.8 API Audit Request Logs Table
CREATE TABLE IF NOT EXISTS public.api_logs (
    id SERIAL PRIMARY KEY,
    sandbox_id TEXT NOT NULL,
    request_id TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    status INTEGER NOT NULL,
    request_json TEXT,
    response_json TEXT,
    at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. INDEXES (Optimized for Sandbox Multi-Tenancy & Lookups)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_customers_lookup 
    ON public.customers (sandbox_id, phone_number, id_number);

CREATE INDEX IF NOT EXISTS idx_accounts_cif 
    ON public.accounts (sandbox_id, cif_number);

CREATE INDEX IF NOT EXISTS idx_sessions_lookup 
    ON public.onboarding_sessions (sandbox_id, phone_number);

CREATE INDEX IF NOT EXISTS idx_phone_locks_lookup 
    ON public.phone_locks (sandbox_id, phone_number);

CREATE INDEX IF NOT EXISTS idx_sms_outbox_phone 
    ON public.sms_outbox (sandbox_id, phone_number, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_logs_sandbox 
    ON public.api_logs (sandbox_id, at DESC);

-- -----------------------------------------------------------------------------
-- 3. LEARNER SCHEMA & ROW-LEVEL ISOLATED VIEWS (Session 2 SQL Practice)
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS learner;

-- 3.1 View: Customers (Hides password_hash, automatically isolated by app.sandbox_id)
CREATE OR REPLACE VIEW learner.customers AS
    SELECT 
        cif_number, 
        id_number, 
        full_name, 
        dob, 
        expiry_date, 
        phone_number, 
        email, 
        address, 
        created_at
    FROM public.customers
    WHERE sandbox_id = current_setting('app.sandbox_id', true);

-- 3.2 View: Accounts
CREATE OR REPLACE VIEW learner.accounts AS
    SELECT 
        account_number, 
        cif_number, 
        product, 
        status, 
        balance, 
        opened_at
    FROM public.accounts
    WHERE sandbox_id = current_setting('app.sandbox_id', true);

-- 3.3 View: Onboarding Sessions (Hides otp_hash)
CREATE OR REPLACE VIEW learner.onboarding_sessions AS
    SELECT 
        id, 
        phone_number, 
        email, 
        status, 
        otp_expires_at, 
        otp_wrong_count, 
        otp_resend_count,
        face_fail_count, 
        locked_until, 
        ocr_json, 
        face_score, 
        cif_number, 
        created_at
    FROM public.onboarding_sessions
    WHERE sandbox_id = current_setting('app.sandbox_id', true);

-- 3.4 View: SMS Outbox
CREATE OR REPLACE VIEW learner.sms_outbox AS
    SELECT 
        id, 
        phone_number, 
        content, 
        sent_at
    FROM public.sms_outbox
    WHERE sandbox_id = current_setting('app.sandbox_id', true);

-- 3.5 View: API Logs
CREATE OR REPLACE VIEW learner.api_logs AS
    SELECT 
        id, 
        request_id, 
        method, 
        path, 
        status, 
        request_json, 
        response_json, 
        at
    FROM public.api_logs
    WHERE sandbox_id = current_setting('app.sandbox_id', true);

-- -----------------------------------------------------------------------------
-- 4. ROLE CONFIGURATION FOR LEARNER SQL PLAYGROUND (/sql)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ekyc_readonly') THEN
        CREATE ROLE ekyc_readonly WITH LOGIN PASSWORD 'readonly_password_secret_24_chars_min';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notice on role creation: %', SQLERRM;
END
$$;

DO $$
BEGIN
    GRANT USAGE ON SCHEMA learner TO ekyc_readonly;
    GRANT SELECT ON ALL TABLES IN SCHEMA learner TO ekyc_readonly;
    ALTER DEFAULT PRIVILEGES IN SCHEMA learner GRANT SELECT ON TABLES TO ekyc_readonly;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notice on permission grants: %', SQLERRM;
END
$$;

-- -----------------------------------------------------------------------------
-- 5. DEFAULT SEED DATA (SANDBOX: DEMO01)
-- -----------------------------------------------------------------------------

-- 5.1 Default Sandbox Record
INSERT INTO public.sandboxes (id, code, name, created_at)
VALUES ('DEMO01', 'DEMO01', 'Demo Sandbox (Khóa học)', NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 5.2 Default Sandbox Settings
INSERT INTO public.settings (sandbox_id, key, value)
VALUES 
    ('DEMO01', 'profile', 'training'),
    ('DEMO01', 'today', '2026-11-23'),
    ('DEMO01', 'dropAfterCoreCommit', 'false'),
    ('DEMO01', 'coreDown', 'false')
ON CONFLICT (sandbox_id, key) DO UPDATE SET value = EXCLUDED.value;

-- 5.3 Clear old seed data for DEMO01 to ensure idempotent clean state
DELETE FROM public.customers WHERE sandbox_id = 'DEMO01';
DELETE FROM public.accounts WHERE sandbox_id = 'DEMO01';
DELETE FROM public.onboarding_sessions WHERE sandbox_id = 'DEMO01';
DELETE FROM public.phone_locks WHERE sandbox_id = 'DEMO01';
DELETE FROM public.sms_outbox WHERE sandbox_id = 'DEMO01';

-- 5.4 Seed 3 Existing Customers:
-- - Customer 1 (Owns phone 0911111111 for testing B2 EKYC-03)
-- - Customer 2 (Persona P06: Owns CCCD 001090000003 for testing BR-105 / D05)
-- - Customer 3 (Active CASA customer with higher balance)
INSERT INTO public.customers (
    sandbox_id, cif_number, id_number, full_name, dob, expiry_date, 
    phone_number, email, address, password_hash, created_at
)
VALUES 
    (
        'DEMO01', 
        '88001001', 
        '001088000001', 
        'NGUYEN HOANG NAM', 
        '1988-10-10', 
        '2038-10-10', 
        '0911111111', 
        'nam.nh@example.com', 
        '123 Pho Hue, Hai Ba Trung, Ha Noi', 
        'hash_demo_1', 
        NOW()
    ),
    (
        'DEMO01', 
        '88001002', 
        '001090000003', -- Persona P06
        'HOANG VAN GIANG', 
        '1990-03-03', 
        '2030-03-03', 
        '0922222222', 
        'giang.hv@example.com', 
        '456 Le Duan, Da Nang', 
        'hash_demo_2', 
        NOW()
    ),
    (
        'DEMO01', 
        '88001003', 
        '079095000005', 
        'TRAN THI MAI', 
        '1995-12-12', 
        '2035-12-12', 
        '0933333333', 
        'mai.tt@example.com', 
        '789 Nguyen Hue, Quan 1, TP Ho Chi Minh', 
        'hash_demo_3', 
        NOW()
    );

-- 5.5 Seed Active CASA Accounts
INSERT INTO public.accounts (
    sandbox_id, account_number, cif_number, product, status, balance, opened_at
)
VALUES 
    ('DEMO01', '1903000000001', '88001001', 'CASA', 'ACTIVE', 5000000, NOW()),
    ('DEMO01', '1903000000002', '88001002', 'CASA', 'ACTIVE', 12500000, NOW()),
    ('DEMO01', '1903000000003', '88001003', 'CASA', 'ACTIVE', 50000000, NOW());

COMMIT;
