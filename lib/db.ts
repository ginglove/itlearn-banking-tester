import * as schema from '@/db/schema';
import { env } from './config';

// Global singleton for db client in serverless/dev environments
type DbInstance = any;

let dbInstance: DbInstance | null = null;

export function getDb(): DbInstance {
  if (dbInstance) {
    return dbInstance;
  }

  const connectionString = env.DATABASE_URL;

  // If using Neon in production or when connection string points to Neon
  if (connectionString.includes('neon.tech') || connectionString.includes('neondb')) {
    const { neon } = require('@neondatabase/serverless');
    const { drizzle } = require('drizzle-orm/neon-http');
    const sql = neon(connectionString);
    dbInstance = drizzle(sql, { schema });
    return dbInstance;
  }

  // Fallback for local Postgres development and testing
  const { Pool } = require('pg');
  const { drizzle } = require('drizzle-orm/node-postgres');

  const pool = new Pool({
    connectionString,
    max: 10,
  });

  dbInstance = drizzle(pool, { schema });
  return dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    const instance = getDb();
    const value = instance[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

export { schema };
