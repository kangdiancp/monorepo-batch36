import { Pool, type PoolClient } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5433),
  database: process.env.DB_NAME ?? 'resto_db',
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'admin',
  max: Number(process.env.DB_POOL_MAX ?? 10),
});

/** Jalankan fn dalam 1 transaksi (BEGIN/COMMIT, ROLLBACK kalau error). */
export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hasil = await fn(client);
    await client.query('COMMIT');
    return hasil;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
