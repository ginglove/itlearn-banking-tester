CREATE TABLE IF NOT EXISTS "accounts" (
	"sandbox_id" text NOT NULL,
	"account_number" text NOT NULL,
	"cif_number" text NOT NULL,
	"product" text DEFAULT 'CASA' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_sandbox_id_account_number_pk" PRIMARY KEY("sandbox_id","account_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"request_id" text NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"status" integer NOT NULL,
	"request_json" text,
	"response_json" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"sandbox_id" text NOT NULL,
	"cif_number" text NOT NULL,
	"id_number" text NOT NULL,
	"full_name" text NOT NULL,
	"dob" text NOT NULL,
	"expiry_date" text NOT NULL,
	"phone_number" text NOT NULL,
	"email" text,
	"address" text,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_sandbox_id_cif_number_pk" PRIMARY KEY("sandbox_id","cif_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "onboarding_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"phone_number" text NOT NULL,
	"email" text,
	"status" text DEFAULT 'INIT' NOT NULL,
	"otp_hash" text,
	"otp_expires_at" timestamp with time zone,
	"otp_wrong_count" integer DEFAULT 0 NOT NULL,
	"otp_resend_count" integer DEFAULT 0 NOT NULL,
	"face_fail_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"ocr_json" text,
	"face_score" real,
	"cif_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "phone_locks" (
	"sandbox_id" text NOT NULL,
	"phone_number" text NOT NULL,
	"locked_until" timestamp with time zone NOT NULL,
	CONSTRAINT "phone_locks_sandbox_id_phone_number_pk" PRIMARY KEY("sandbox_id","phone_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sandboxes" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sandboxes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"sandbox_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "settings_sandbox_id_key_pk" PRIMARY KEY("sandbox_id","key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sms_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"phone_number" text NOT NULL,
	"content" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
