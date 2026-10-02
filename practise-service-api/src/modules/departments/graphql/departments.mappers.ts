import type {
  CreateDepartmentInput as GqlCreateDepartmentInput,
  UpdateDepartmentInput as GqlUpdateDepartmentInput,
} from '../../../graphql/generated/resolvers-types'
import type { CreateDepartmentInput, UpdateDepartmentInput } from '../departments.schema'

export function mapCreateInput(input: GqlCreateDepartmentInput): CreateDepartmentInput {
  return {
    department_name: input.departmentName,
    location_id: input.locationId,
  }
}

export function mapUpdateInput(input: GqlUpdateDepartmentInput): UpdateDepartmentInput {
  return {
    department_name: input.departmentName ?? undefined,
    location_id: input.locationId,
  }
}