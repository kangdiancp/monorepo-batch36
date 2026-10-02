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


  return new GraphQLError('Internal server error', {
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  })
}