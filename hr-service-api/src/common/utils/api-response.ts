import type { FastifyReply } from 'fastify';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * create generic response for all rest api.
 */
export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  message = 'OK',
  statusCode = 200,
  pagination?: Pagination,
): FastifyReply {
  return reply.status(statusCode).send({
    success: true,
    message,
    data,
    ...(pagination ? { pagination } : {}),
  });
}
