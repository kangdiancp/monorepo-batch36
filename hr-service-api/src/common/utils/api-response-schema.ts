import { Type, type TSchema } from '@sinclair/typebox'

export const paginationSchema = Type.Object({
  page: Type.Integer({ minimum: 1 }),
  limit: Type.Integer({ minimum: 1 }),
  total: Type.Integer({ minimum: 0 }),
  totalPages: Type.Integer({ minimum: 0 }),
})


export const createApiResponseSchema = <T extends TSchema>(dataSchema: T) =>
  Type.Object({
    success: Type.Boolean({ example: true }),
    message: Type.String({ example: 'OK' }),
    data: dataSchema,
    pagination: Type.Optional(paginationSchema),
  })



export const createApiListResponseSchema = <T extends TSchema>(itemSchema: T) =>
  Type.Object({
    success: Type.Boolean({ example: true }),
    message: Type.String({ example: 'OK' }),
    data: Type.Array(itemSchema),
    pagination: paginationSchema,
  })


export const apiEmptyResponseSchema = Type.Object({
  success: Type.Boolean({ example: true }),
  message: Type.String({ example: 'OK' }),
  data: Type.Null(),
})