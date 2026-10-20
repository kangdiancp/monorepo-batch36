import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import { env } from '../config/env';
import * as schema from './schema';

/**
 * Kita populate connection untuk hr_db dan payroll_db disini.
 */
function createDatabaseConnection(config: PoolConfig, dbNameForLog: string) {
  const pool = new Pool(config);

  pool.on('error', (err) => {
    console.error(`Unexpected error pada idle PostgreSQL client (${dbNameForLog})`, err);
    process.exit(1);
  });

  const db = drizzle(pool, {
    schema,
    logger: env.NODE_ENV === 'development',
  });

  async function checkConnection(): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }

  return { pool, db, checkConnection };
}

// 1. Inisialisasi Database HR
const hrConnection = createDatabaseConnection(
  {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    max: env.DB_POOL_MAX,
    ssl: env.DB_SSL ? { rejectUnauthorized: false } : undefined,
    options: `-c search_path=${env.DB_SCHEMA},public`,
  },
  'HR_DB'
);

export const pool_hr = hrConnection.pool;
export const db_hr = hrConnection.db;
export const checkDatabaseConnection = hrConnection.checkConnection;


// 2. Inisialisasi Database Payroll
const payrollConnection = createDatabaseConnection(
  {
    host: env.DB_HOST_PAYROLL ?? 'localhost',
    port: Number(env.DB_PORT_PAYROLL ?? 5432),
    database: env.DB_NAME_PAYROLL ?? 'payroll_db',
    user: env.DB_USER_PAYROLL ?? 'postgres',
    password: env.DB_PASSWORD_PAYROLL ?? 'admin',
    max: 5,
  },
  'PAYROLL_DB'
);

export const pool_payroll = payrollConnection.pool;
export const db_payroll = payrollConnection.db;
export const checkDatabaseConnectionPayroll = payrollConnection.checkConnection;