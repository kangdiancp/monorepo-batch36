import dotenv from 'dotenv';
import path from 'node:path';


const NODE_ENV = process.env.NODE_ENV ?? 'development';

for (const file of [`.env.${NODE_ENV}.local`, `.env.${NODE_ENV}`, '.env.local', '.env']) {
  dotenv.config({ path: path.resolve(process.cwd(), file) });
}


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
  PORT: optionalPositiveInt('PORT', 3000),
  GRPC_PORT: optionalPositiveInt('GRPC_PORT', 50051),
  API_PREFIX: optionalString('API_PREFIX', '/api/v1'),

  DB_HOST: requireString('DB_HOST'),
  DB_PORT: optionalPositiveInt('DB_PORT', 5432),
  DB_NAME: requireString('DB_NAME'),
  DB_USER: requireString('DB_USER'),
  DB_PASSWORD: requireString('DB_PASSWORD'),
  DB_SCHEMA: optionalString('DB_SCHEMA', 'hr'),
  DB_POOL_MAX: optionalPositiveInt('DB_POOL_MAX', 10),
  DB_SSL: optionalBoolean('DB_SSL', false),
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
