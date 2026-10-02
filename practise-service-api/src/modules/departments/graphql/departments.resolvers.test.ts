import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as departmentService from '../departments.service'
import { departmentResolvers } from './departments.resolvers'
import type { DepartmentRow } from '../departments.types'

vi.mock('../departments.service')

const mockedService = vi.mocked(departmentService)

const queryDepartments = departmentResolvers.Query!.departments as any
const queryDepartment = departmentResolvers.Query!.department as any
const mutationCreateDepartment = departmentResolvers.Mutation!.createDepartment as any
const mutationUpdateDepartment = departmentResolvers.Mutation!.updateDepartment as any
const mutationDeleteDepartment = departmentResolvers.Mutation!.deleteDepartment as any
const departmentEmployeesResolver = departmentResolvers.Department!.employees as any

const sampleDepartment: DepartmentRow = {
  departmentId: 1,
  departmentName: 'Engineering',
  locationId: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('departments.resolvers', () => {
  it('Query.departments mengembalikan items & pagination', async () => {
    const pagination = { page: 1, limit: 20, total: 1, totalPages: 1 }
    mockedService.listDepartments.mockResolvedValue({ items: [sampleDepartment], pagination })

    const result = await queryDepartments({}, { page: 1, limit: 20 })

    expect(result).toEqual({ items: [sampleDepartment], pagination })
    expect(mockedService.listDepartments).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
    )
  })

  it('Query.department melempar GraphQLError NOT_FOUND kalau ApiError.notFound', async () => {
    const { ApiError } = await import('../../../common/utils/api-error')
    mockedService.getDepartmentById.mockRejectedValue(ApiError.notFound('Department with id 999 not found'))

    await expect(queryDepartment({}, { id: 999 })).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    })
  })

  it('Mutation.createDepartment mapping camelCase -> snake_case sebelum panggil service', async () => {
    mockedService.createDepartment.mockResolvedValue(sampleDepartment)

    await mutationCreateDepartment({}, { input: { departmentName: 'Engineering', locationId: 2 } })

    expect(mockedService.createDepartment).toHaveBeenCalledWith(
      expect.objectContaining({ department_name: 'Engineering', location_id: 2 }),
    )
  })

  it('Mutation.updateDepartment meneruskan hasil mapping ke service', async () => {
    mockedService.updateDepartment.mockResolvedValue({ ...sampleDepartment, departmentName: 'Finance' })

    const result = await mutationUpdateDepartment({}, { id: 1, input: { departmentName: 'Finance' } })

    expect(mockedService.updateDepartment).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ department_name: 'Finance' }),
    )
    expect(result.departmentName).toBe('Finance')
  })

  it('Mutation.deleteDepartment return true kalau sukses', async () => {
    mockedService.deleteDepartment.mockResolvedValue(undefined)

    const result = await mutationDeleteDepartment({}, { id: 1 })

    expect(result).toBe(true)
  })

  it('Department.employees memanggil employeesByDepartmentLoader.load dengan departmentId', async () => {
    const load = vi.fn().mockResolvedValue([])
    const ctx = { loaders: { employeesByDepartmentLoader: { load } } } as any

    await departmentEmployeesResolver({ departmentId: 1 }, {}, ctx)

    expect(load).toHaveBeenCalledWith(1)
  })
})