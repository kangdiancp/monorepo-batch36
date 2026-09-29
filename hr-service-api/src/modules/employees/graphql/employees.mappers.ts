import type {
  CreateEmployeeInput as GqlCreateEmployeeInput,
  UpdateEmployeeInput as GqlUpdateEmployeeInput,
} from '../../../graphql/generated/resolvers-types'
import type { CreateEmployeeInput, UpdateEmployeeInput } from '../employees.schema'

export function mapCreateInput(input: GqlCreateEmployeeInput): CreateEmployeeInput {
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone_number: input.phoneNumber,
    hire_date: input.hireDate,
    job_id: input.jobId,
    salary: input.salary,
    manager_id: input.managerId,
    department_id: input.departmentId,
    employment_status: input.employmentStatus as CreateEmployeeInput['employment_status'],
    employment_type: input.employmentType as CreateEmployeeInput['employment_type'],
    termination_date: input.terminationDate,
  }
}

export function mapUpdateInput(input: GqlUpdateEmployeeInput): UpdateEmployeeInput {
  return {
    first_name: input.firstName,
    last_name: input.lastName ?? undefined,
    email: input.email ?? undefined,
    phone_number: input.phoneNumber,
    hire_date: input.hireDate ?? undefined,
    job_id: input.jobId ?? undefined,
    salary: input.salary ?? 0.0,
    manager_id: input.managerId,
    department_id: input.departmentId,
    employment_status: input.employmentStatus as UpdateEmployeeInput['employment_status'],
    employment_type: input.employmentType as UpdateEmployeeInput['employment_type'],
    termination_date: input.terminationDate,
  }
}