import type { FastifyPluginAsync } from 'fastify';
import { payrollRunRoutes } from '../modules/payroll-run/payroll-run.routes';
import { sagaRoutes } from '../modules/saga/saga.routes';
import { hrProxyRoutes } from '../modules/hr-proxy/hr-proxy.routes';

export const apiRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(payrollRunRoutes, { prefix: '/payroll-runs' });
  await fastify.register(sagaRoutes, { prefix: '/saga-instances' });
  await fastify.register(hrProxyRoutes, { prefix: '/hr' });
};
