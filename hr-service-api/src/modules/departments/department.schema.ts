import { createSelectSchema } from 'drizzle-typebox'
import { Type, type Static } from '@sinclair/typebox'
import { departments } from '../../db/schema'

//for select
export const departmentSchema = createSelectSchema(departments)
export type Department = Static<typeof departmentSchema> 

//for create
export const createDepartmentBodySchema = Type.Object({
    department_name: Type.String({ minLength: 1, maxLength: 30 }),
    location_id: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
}, { additionalProperties: false })
export type CreateDepartmentInput = Static<typeof createDepartmentBodySchema>

// for update
export const updateDepartmentBodySchema = Type.Object({
    department_name: Type.Optional(Type.String({ minLength: 1, maxLength: 30 })),
    location_id: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
}, { additionalProperties: false })
export type UpdateDepartmentInput = Static<typeof updateDepartmentBodySchema>


// for findbyId  `/:id` seperti regions.
export const departmentIdParamSchema = Type.Object({
    id: Type.Integer({ minimum: 1 }),
})
export type DepartmentIdParam = Static<typeof departmentIdParamSchema>

// Query — list (pagination + search + filter by location)
export const listDepartmentQuerySchema = Type.Object({
    page: Type.Integer({ minimum: 1, default: 1 }),
    limit: Type.Integer({ minimum: 1, maximum: 100, default: 20 }),
    search: Type.Optional(Type.String({ maxLength: 30 })),
    locationId: Type.Optional(Type.Integer({ minimum: 1 })),
})
export type ListDepartmentQuery = Static<typeof listDepartmentQuerySchema>

