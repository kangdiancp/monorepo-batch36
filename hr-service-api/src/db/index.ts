import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env';
import * as schema from './schema';


export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: env.DB_POOL_MAX,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : undefined,
  options: `-c search_path=${env.DB_SCHEMA},public`,
});

pool.on('error', (err) => {
  console.error('Unexpected error pada idle PostgreSQL client', err);
  process.exit(1);
});

export const db = drizzle(pool, {
  schema,
  logger: env.NODE_ENV === 'development',
});

export async function checkDatabaseConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
