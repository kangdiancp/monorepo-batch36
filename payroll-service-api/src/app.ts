import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { JsonSchemaToTsProvider } from '@fastify/type-provider-json-schema-to-ts';
import Fastify from 'fastify';
import { errorHandler, notFoundHandler } from './common/handlers/error-handler';
import { env } from './config/env';
import { apiRoutes } from './routes';


export async function createApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  }).withTypeProvider<JsonSchemaToTsProvider>();

  await app.register(helmet);
  await app.register(cors);

  // Kita gunakan body parsing JSON bawaan Fastify (`content-type: application/json`),
  // tidak perlu plugin/middleware tambahan seperti `express.json()`.

  // Pastikan setErrorHandler/setNotFoundHandler didaftarkan sebelum
  // `app.register(apiRoutes, ...)`.
  app.setNotFoundHandler(notFoundHandler);
  app.setErrorHandler(errorHandler);

  app.get('/health', async () => ({ success: true, message: 'payroll-service-api is healthy' }));

  await app.register(apiRoutes, { prefix: env.API_PREFIX });

  return app;
}
