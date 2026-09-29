import type { FastifyPluginAsync } from 'fastify';
import { regionRoutes } from '../modules/regions/regions.routes';
import { departmentRoutes } from '../modules/departments/departments.routes';
import { employeeRoutes } from '../modules/employees/employees.route';

export const apiRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(regionRoutes, { prefix: '/regions' }),
  await fastify.register(departmentRoutes, { prefix: '/departments' })
  await fastify.register(employeeRoutes, { prefix: '/employees' });

};
