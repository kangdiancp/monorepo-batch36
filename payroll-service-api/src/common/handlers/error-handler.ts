import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../config/env';
import { ApiError } from '../utils/api-error';

export function notFoundHandler(request: FastifyRequest, reply: FastifyReply): void {
  reply.status(404).send({
    success: false,
    message: `Route ${request.method} ${request.url} tidak ditemukan`,
  });
}

/**
 * Postgres error code -> HTTP status mapping yang paling sering muncul.
 * Referensi: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
function mapPgErrorCode(code: string): { statusCode: number; message: string } | null {
  switch (code) {
    case '23505': // unique_violation
      return { statusCode: 409, message: 'Data sudah ada (duplikat)' };
    case '23503': // foreign_key_violation
      return { statusCode: 409, message: 'Data terkait masih direferensikan / tidak ditemukan' };
    case '23502': // not_null_violation
      return { statusCode: 400, message: 'Ada kolom wajib yang belum diisi' };
    default:
      return null;
  }
}

function formatValidationErrors(validation: FastifyError['validation']): Record<string, string[]> {
  const details: Record<string, string[]> = {};

  for (const err of validation ?? []) {
    const missingProperty = (err.params as { missingProperty?: string } | undefined)?.missingProperty;
    const field = missingProperty ?? (err.instancePath ? err.instancePath.replace(/^\//, '').replace(/\//g, '.') : '_');
    const message = err.message ?? 'Tidak valid';

    details[field] ??= [];
    details[field].push(message);
  }

  return details;
}


function extractPgErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  if ('code' in error && typeof error.code === 'string') {
    return error.code;
  }
  if ('cause' in error && typeof error.cause === 'object' && error.cause !== null) {
    const cause = error.cause as { code?: unknown };
    if (typeof cause.code === 'string') {
      return cause.code;
    }
  }
  return undefined;
}


export function errorHandler(error: FastifyError, _request: FastifyRequest, reply: FastifyReply): void {

  if (error.validation) {
    reply.status(400).send({
      success: false,
      message: 'Validasi input gagal',
      details: formatValidationErrors(error.validation),
    });
    return;
  }

  if (error instanceof ApiError) {
    reply.status(error.statusCode).send({
      success: false,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
    return;
  }

  const pgErrorCode = extractPgErrorCode(error);
  if (pgErrorCode) {
    const mapped = mapPgErrorCode(pgErrorCode);
    if (mapped) {
      reply.status(mapped.statusCode).send({ success: false, message: mapped.message });
      return;
    }
  }

  console.error('Unhandled error:', error);

  reply.status(500).send({
    success: false,
    message: 'Terjadi kesalahan pada server',
    ...(env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
  });
}
