import type { FastifyPluginAsync } from 'fastify';
import { hrProxyRoutes } from '../modules/grpc/payroll-client-proxy/payroll-proxy.routes';

export const apiRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(hrProxyRoutes, { prefix: '/client' });
};
