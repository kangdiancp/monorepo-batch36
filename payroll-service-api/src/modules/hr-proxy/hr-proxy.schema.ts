import { Type, type Static } from '@sinclair/typebox'

export const employeeIdParamSchema = Type.Object({
  id: Type.Integer({ minimum: 1 }),
})
export type EmployeeIdParam = Static<typeof employeeIdParamSchema>

// baru nambahin
export const createDepartmentBodySchema = Type.Object({
  department_name: Type.String({ minLength: 1, maxLength: 30 }),
}, { additionalProperties: false })
export type CreateDepartmentInput = Static<typeof createDepartmentBodySchema>