import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().optional().default('postgres://postgres:postgres@localhost:5432/neobank_ekyc'),
  DATABASE_URL_UNPOOLED: z.string().optional().default('postgres://postgres:postgres@localhost:5432/neobank_ekyc'),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  SESSION_SECRET: z.string().min(32).default('a_very_secure_random_session_secret_32_chars_minimum_neobank'),
  TRAINER_PIN: z.string().default('123456'),
  READONLY_DB_PASSWORD: z.string().default('readonly_password_secret_24_chars_min'),
  DEFAULT_PROFILE: z.enum(['training', 'reference']).default('training'),
  DEFAULT_TODAY: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default('2026-11-23'),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  SESSION_SECRET: process.env.SESSION_SECRET,
  TRAINER_PIN: process.env.TRAINER_PIN,
  READONLY_DB_PASSWORD: process.env.READONLY_DB_PASSWORD,
  DEFAULT_PROFILE: process.env.DEFAULT_PROFILE,
  DEFAULT_TODAY: process.env.DEFAULT_TODAY,
});

export type Env = z.infer<typeof envSchema>;
