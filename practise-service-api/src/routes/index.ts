import type { FastifyPluginAsync } from 'fastify';
import { hrProxyRoutes } from '../modules/hr-proxy/hr-proxy.routes';

export const apiRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(hrProxyRoutes, { prefix: '/client' });
};
