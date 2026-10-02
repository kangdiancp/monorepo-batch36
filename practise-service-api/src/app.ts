import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { JsonSchemaToTsProvider } from '@fastify/type-provider-json-schema-to-ts';
import Fastify from 'fastify';
import { errorHandler, notFoundHandler } from './common/handlers/error-handler';
import { env } from './config/env';
import { apiRoutes } from './routes';

export async function createApp() {
  const app = Fastify({
    // Fastify pakai logger `pino` bawaan — ini pengganti `morgan` di versi
    // Express. Dimatikan waktu test (NODE_ENV=test) supaya output test bersih.
    logger: env.NODE_ENV !== 'test',
  }).withTypeProvider<JsonSchemaToTsProvider>();

  await app.register(helmet);
  await app.register(cors);

  // Body parsing JSON sudah bawaan Fastify (`content-type: application/json`),
  // tidak perlu plugin/middleware tambahan seperti `express.json()`.

  // PENTING: setErrorHandler/setNotFoundHandler HARUS didaftarkan SEBELUM
  // `app.register(apiRoutes, ...)`. Fastify punya model encapsulation per
  // plugin — child plugin (departmentRoutes, dst) mewarisi error handler
  // dari parent PERSIS PADA SAAT plugin itu di-register, bukan versi
  // "terbaru" kalau parent-nya baru set setelahnya. Kalau urutannya kebalik,
  // error dari dalam route module bakal balik ke format default Fastify
  // (`{statusCode, code: 'FST_ERR_VALIDATION', error, message}`), BUKAN
  // format konsisten `{success, message, details}` yang kita mau.
  app.setNotFoundHandler(notFoundHandler);
  app.setErrorHandler(errorHandler);

  app.get('/health', async () => ({ success: true, message: 'payroll-service-api is healthy' }));

  await app.register(apiRoutes, { prefix: env.API_PREFIX });

  return app;
}
