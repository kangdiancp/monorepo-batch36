import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { JsonSchemaToTsProvider } from '@fastify/type-provider-json-schema-to-ts';
import Fastify from 'fastify';
import { errorHandler, notFoundHandler } from './common/handlers/error-handler';
import { env } from './config/env';
import { apiRoutes } from './routes';

import mercurius from 'mercurius'
import { schema, resolvers } from './graphql/schema'
import { createEmployeeLoaders } from './modules/employees/graphql/employees.loaders'
import { createDepartmentLoaders } from './modules/departments/graphql/departments.loaders';
import './graphql/mercurius-context'


export async function createApp() {
  const app = Fastify({
    // Fastify pake logger `pino` bawaan, sebagai pengganti `morgan` kalo versi Express.
    // Di off waktu mode test (NODE_ENV=test) supaya output test bersih.
    logger: env.NODE_ENV !== 'test',
  }).withTypeProvider<JsonSchemaToTsProvider>();

  await app.register(helmet);
  await app.register(cors);

  // Body parsing JSON sudah bawaan Fastify (`content-type: application/json`),
  // tidak perlu plugin/middleware tambahan seperti `express.json()`.

  app.setNotFoundHandler(notFoundHandler);
  app.setErrorHandler(errorHandler);

  app.get('/health', async () => ({ success: true, message: 'hr-service-api is healthy' }));

  await app.register(apiRoutes, { prefix: env.API_PREFIX });

  
  //mercurius : server graphql
  await app.register(mercurius, {
    schema,
    resolvers: resolvers as any,
    graphiql: env.NODE_ENV !== 'production',
    context: async () => ({
      loaders: {
        ...createEmployeeLoaders(),
        ...createDepartmentLoaders(),
      }
    }),
  });

  return app;
}
