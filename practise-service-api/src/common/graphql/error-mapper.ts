// Taruh di: src/common/graphql/error-mapper.ts
//
// REST: ApiError -> Fastify error handler -> HTTP status code (404, 400, dst).
// GraphQL: semua response tetap HTTP 200; error masuk ke `errors[]` dengan
// `extensions.code`. File ini jembatannya, ApiError.ts sendiri TIDAK diubah.

import { GraphQLError } from 'graphql'
import { ApiError } from '../utils/api-error'

const statusToCode: Record<number, string> = {
  400: 'BAD_REQUEST',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
}

export function toGraphQLError(err: unknown): GraphQLError {
  if (err instanceof ApiError) {
    return new GraphQLError(err.message, {
      extensions: { code: statusToCode[err.statusCode] ?? 'INTERNAL_SERVER_ERROR' },
    })
  }
  if (err instanceof GraphQLError) return err

  // Jangan bocorkan detail error asli (misal SQL error) ke client.
  return new GraphQLError('Internal server error', {
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  })
}