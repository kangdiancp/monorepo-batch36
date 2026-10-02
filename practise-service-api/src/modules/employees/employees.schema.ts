import { createSelectSchema } from 'drizzle-typebox'
import { Type, type Static } from '@sinclair/typebox'
import { employees } from '../../db/schema' 

// Enum — mirror dari ck_employees_status & ck_employees_type

const employmentStatusSchema = Type.Union([
  Type.Literal('ACTIVE'),
  Type.Literal('ON_LEAVE'),
  Type.Literal('SUSPENDED'),
  Type.Literal('RESIGNED'),
  Type.Literal('TERMINATED'),
])

const employmentTypeSchema = Type.Union([
  Type.Literal('PERMANENT'),
  Type.Literal('CONTRACT'),
  Type.Literal('INTERN'),
  Type.Literal('PROBATION'),
])

// hasil generate schema di drizzle untuk value numeric(8,2) postgres diubah ke String
// jadi kita harus ubah dulu ke number agar match dengan employee.schema
const salarySchema = Type.Number({ exclusiveMinimum: 0 })


export const employeeSchema = createSelectSchema(employees, {
  employmentStatus: employmentStatusSchema,
  employmentType: employmentTypeSchema,
  salary: salarySchema,
})
export type Employee = Static<typeof employeeSchema>


export const createEmployeeBodySchema = Type.Object({
  first_name: Type.Optional(Type.Union([Type.String({ minLength: 1, maxLength: 20 }), Type.Null()])),
  last_name: Type.String({ minLength: 1, maxLength: 25 }),
  email: Type.String({ format: 'email', maxLength: 100 }),
  phone_number: Type.Optional(Type.Union([Type.String({ minLength: 1, maxLength: 20 }), Type.Null()])),
  hire_date: Type.String({ format: 'date' }),
  job_id: Type.Integer({ minimum: 1 }),
  salary: salarySchema,
  manager_id: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  department_id: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  employment_status: Type.Optional(employmentStatusSchema), // default 'ACTIVE' di DB
  employment_type: Type.Optional(employmentTypeSchema),     // default 'PERMANENT' di DB
  termination_date: Type.Optional(Type.Union([Type.String({ format: 'date' }), Type.Null()])),
}, { additionalProperties: false })
export type CreateEmployeeInput = Static<typeof createEmployeeBodySchema>

// Body — update (PATCH) jadikan semua optional type.
export const updateEmployeeBodySchema = Type.Object({
  first_name: Type.Optional(Type.Union([Type.String({ minLength: 1, maxLength: 20 }), Type.Null()])),
  last_name: Type.Optional(Type.String({ minLength: 1, maxLength: 25 })),
  email: Type.Optional(Type.String({ format: 'email', maxLength: 100 })),
  phone_number: Type.Optional(Type.Union([Type.String({ minLength: 1, maxLength: 20 }), Type.Null()])),
  hire_date: Type.Optional(Type.String({ format: 'date' })),
  job_id: Type.Optional(Type.Integer({ minimum: 1 })),
  salary: Type.Optional(salarySchema),
  manager_id: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  department_id: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  employment_status: Type.Optional(employmentStatusSchema),
  employment_type: Type.Optional(employmentTypeSchema),
  termination_date: Type.Optional(Type.Union([Type.String({ format: 'date' }), Type.Null()])),
}, { additionalProperties: false })
export type UpdateEmployeeInput = Static<typeof updateEmployeeBodySchema>

// Params
export const employeeIdParamSchema = Type.Object({
  id: Type.Integer({ minimum: 1 }),
})
export type EmployeeIdParam = Static<typeof employeeIdParamSchema>

// Query — list (pagination + filter)
export const listEmployeeQuerySchema = Type.Object({
  page: Type.Integer({ minimum: 1, default: 1 }),
  limit: Type.Integer({ minimum: 1, maximum: 100, default: 20 }),
  search: Type.Optional(Type.String({ maxLength: 100 })), // cari di first_name/last_name/email
  departmentId: Type.Optional(Type.Integer({ minimum: 1 })),
  jobId: Type.Optional(Type.Integer({ minimum: 1 })),
  managerId: Type.Optional(Type.Integer({ minimum: 1 })),
  employmentStatus: Type.Optional(employmentStatusSchema),
  employmentType: Type.Optional(employmentTypeSchema),
})
export type ListEmployeeQuery = Static<typeof listEmployeeQuerySchema>