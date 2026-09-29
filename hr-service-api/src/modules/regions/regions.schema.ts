import { createSelectSchema } from 'drizzle-typebox'
import { Type, type Static } from '@sinclair/typebox'
import { regions } from '../../db/schema'


export const regionSchema = createSelectSchema(regions)
export type Region = Static<typeof regionSchema>


export const createRegionBodySchema = Type.Object({
  regionName: Type.String({ minLength: 1, maxLength: 25 }),
}, { additionalProperties: false })
export type CreateRegionInput = Static<typeof createRegionBodySchema>

export const updateRegionBodySchema = Type.Object({
  regionName: Type.Optional(Type.String({ minLength: 1, maxLength: 25 })),
}, { additionalProperties: false })
export type UpdateRegionInput = Static<typeof updateRegionBodySchema>

export const regionIdParamSchema = Type.Object({
  id: Type.Integer({ minimum: 1 }),
})
export type RegionIdParam = Static<typeof regionIdParamSchema>

//"http://localhost:3000/api/hr/regions"
// page :1, limit:20, search :null
export const listRegionQuerySchema = Type.Object({
  page: Type.Integer({ minimum: 1, default: 1 }),
  limit: Type.Integer({ minimum: 1, maximum: 100, default: 5 }),
  search: Type.Optional(Type.String({ maxLength: 25 })),
})
export type ListRegionQuery = Static<typeof listRegionQuerySchema>


// Query — detail (?include=countries)

export const regionDetailQuerySchema = Type.Object({
  include: Type.Optional(Type.Literal('countries')),
})
export type RegionDetailQuery = Static<typeof regionDetailQuerySchema>