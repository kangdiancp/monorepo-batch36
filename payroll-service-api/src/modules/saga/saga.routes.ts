import type { FastifyPluginAsync } from 'fastify';
import * as sagaController from './saga.controller';
import {
  createSagaInstanceBodySchema,
  listSagaInstanceQuerySchema,
  sagaInstanceIdParamSchema,
  sagaTaskParamSchema,
  updateSagaTaskBodySchema,
} from './saga.schema';

export const sagaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { schema: { querystring: listSagaInstanceQuerySchema } }, sagaController.listSagaInstances);

  fastify.get(
    '/:id',
    { schema: { params: sagaInstanceIdParamSchema } },
    sagaController.getSagaInstance,
  );

  // Otomatis generate 12 saga_tasks (Run Payroll -> ... -> System Closed) sekaligus
  fastify.post('/', { schema: { body: createSagaInstanceBodySchema } }, sagaController.createSagaInstance);

  fastify.patch(
    '/:id/tasks/:taskId',
    { schema: { params: sagaTaskParamSchema, body: updateSagaTaskBodySchema } },
    sagaController.updateSagaTask,
  );
};
