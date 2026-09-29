import dotenv from 'dotenv';
import path from 'node:path';

/**
 * Loading env file bertingkat berdasarkan NODE_ENV, urutan prioritas
 * (yang paling atas menang, karena dotenv.config() TIDAK override
 * process.env yang sudah ke-set sebelumnya):
 *
 *   1. .env.{NODE_ENV}.local   -> override lokal khusus environment ini (gitignored)
 *   2. .env.{NODE_ENV}          -> nilai default per environment (mis. .env.test)
 *   3. .env.local                -> override lokal umum, semua environment (gitignored)
 *   4. .env                       -> fallback paling umum / dasar
 *
 * Variable yang sudah di-set duluan lewat shell/CI/platform (Docker ENV, Railway,
 * systemd, dst) SELALU menang di atas semua file ini.
 */
const NODE_ENV = process.env.NODE_ENV ?? 'development';

for (const file of [`.env.${NODE_ENV}.local`, `.env.${NODE_ENV}`, '.env.local', '.env']) {
  dotenv.config({ path: path.resolve(process.cwd(), file) });
}

/**
 * Validasi environment variable MANUAL (bukan Zod / library eksternal) —
 * konsisten dengan hr-service-api: tidak ada dependency validasi tambahan
 * di luar yang bawaan Fastify (JSON Schema/AJV, khusus utk HTTP request).
 */

type NodeEnvValue = 'development' | 'test' | 'production';
const VALID_NODE_ENVS: NodeEnvValue[] = ['development', 'test', 'production'];

const errors: string[] = [];

function requireString(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    errors.push(`${name} wajib diisi`);
    return '';
  }
  return value;
}

function optionalString(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : fallback;
}

function optionalPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    errors.push(`${name} harus berupa angka bulat positif (didapat: "${raw}")`);
    return fallback;
  }
  return parsed;
}

function optionalBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  if (raw !== 'true' && raw !== 'false') {
    errors.push(`${name} harus "true" atau "false" (didapat: "${raw}")`);
    return fallback;
  }
  return raw === 'true';
}

function parseNodeEnv(): NodeEnvValue {
  const raw = process.env.NODE_ENV;
  if (raw === undefined || raw.trim() === '') {
    return 'development';
  }
  if (!VALID_NODE_ENVS.includes(raw as NodeEnvValue)) {
    errors.push(`NODE_ENV harus salah satu dari: ${VALID_NODE_ENVS.join(', ')} (didapat: "${raw}")`);
    return 'development';
  }
  return raw as NodeEnvValue;
}

const parsedEnv = {
  NODE_ENV: parseNodeEnv(),
  PORT: optionalPositiveInt('PORT', 3001),
  API_PREFIX: optionalString('API_PREFIX', '/api/v1'),

  DB_HOST: requireString('DB_HOST'),
  DB_PORT: optionalPositiveInt('DB_PORT', 5432),
  DB_NAME: requireString('DB_NAME'),
  DB_USER: requireString('DB_USER'),
  DB_PASSWORD: requireString('DB_PASSWORD'),
  // Payroll DB berisi banyak schema (fin, hr replica, saga) dalam 1 database.
  DB_SCHEMAS: optionalString('DB_SCHEMAS', 'fin,hr,saga,public'),
  DB_POOL_MAX: optionalPositiveInt('DB_POOL_MAX', 10),
  DB_SSL: optionalBoolean('DB_SSL', false),

  // Koneksi gRPC ke hr-service-api (client di src/grpc/hr-client.ts)
  HR_GRPC_HOST: optionalString('HR_GRPC_HOST', 'localhost'),
  HR_GRPC_PORT: optionalPositiveInt('HR_GRPC_PORT', 50051),
};

if (errors.length > 0) {
  console.error('Konfigurasi environment variable tidak valid:');
  for (const err of errors) {
    console.error(`   - ${err}`);
  }
  process.exit(1);
}

export const env = parsedEnv;
export type Env = typeof env;
