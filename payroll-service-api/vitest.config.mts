import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],

    env: {
      NODE_ENV: 'test',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_NAME: 'payroll_db_test',
      DB_USER: 'postgres',
      DB_PASSWORD: 'postgres',
      DB_SCHEMAS: 'fin,hr,saga,public',
    },

    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
