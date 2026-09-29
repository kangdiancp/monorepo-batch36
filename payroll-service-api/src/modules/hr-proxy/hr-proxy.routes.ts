import type { FastifyPluginAsync } from 'fastify';
import * as hrProxyController from './hr-proxy.controller';
import { createDepartmentBodySchema, employeeIdParamSchema } from './hr-proxy.schema';

export const hrProxyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/employees/:id',
    { schema: { params: employeeIdParamSchema } },
    hrProxyController.getEmployee,
  );

  fastify.get('/departments', hrProxyController.listDepartments);

  fastify.post(
    '/departments',
    { schema: { body: createDepartmentBodySchema } },
    hrProxyController.createDepartments,
  );
};