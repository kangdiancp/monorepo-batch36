import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as employeeService from '../employees.service'
import { employeeResolvers } from './employees.resolvers'
import type { EmployeeApiRow } from '../employees.types'

vi.mock('../employees.service')

const mockedService = vi.mocked(employeeService)


const queryEmployees = employeeResolvers.Query!.employees as any
const queryEmployee = employeeResolvers.Query!.employee as any
const mutationCreateEmployee = employeeResolvers.Mutation!.createEmployee as any
const mutationUpdateEmployee = employeeResolvers.Mutation!.updateEmployee as any
const mutationDeleteEmployee = employeeResolvers.Mutation!.deleteEmployee as any
const employeeJobResolver = employeeResolvers.Employee!.job as any
const employeeManagerResolver = employeeResolvers.Employee!.manager as any
const employeeDirectReportsResolver = employeeResolvers.Employee!.directReports as any

const sampleEmployee: EmployeeApiRow = {
  employeeId: 1,
  firstName: 'Budi',
  lastName: 'Santoso',
  email: 'budi@example.com',
  phoneNumber: null,
  hireDate: '2024-01-01',
  jobId: 1,
  salary: 8500000,
  managerId: null,
  departmentId: null,
  employmentStatus: 'ACTIVE',
  employmentType: 'PERMANENT',
  terminationDate: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('employees.resolvers', () => {
  it('Query.employees mengembalikan items & pagination', async () => {
    const pagination = { page: 1, limit: 20, total: 1, totalPages: 1 }
    mockedService.listEmployees.mockResolvedValue({ items: [sampleEmployee], pagination })


    const result = await queryEmployees({}, { page: 1, limit: 20 })

    expect(result).toEqual({ items: [sampleEmployee], pagination })
    expect(mockedService.listEmployees).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
    )
  })

  it('Query.employee melempar GraphQLError NOT_FOUND kalau ApiError.notFound', async () => {
    const { ApiError } = await import('../../../common/utils/api-error')
    mockedService.getEmployeeById.mockRejectedValue(ApiError.notFound('Employee with id 999 not found'))

    await expect(queryEmployee({}, { id: 999 })).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    })
  })

  it('Mutation.createEmployee mapping camelCase -> snake_case sebelum panggil service', async () => {
    mockedService.createEmployee.mockResolvedValue(sampleEmployee)

    await mutationCreateEmployee(
      {},
      {
        input: {
          lastName: 'Santoso',
          email: 'budi@example.com',
          hireDate: '2024-01-01',
          jobId: 1,
          salary: 8500000,
        },
      },
    )

    expect(mockedService.createEmployee).toHaveBeenCalledWith(
      expect.objectContaining({ last_name: 'Santoso', hire_date: '2024-01-01', job_id: 1 }),
    )
  })

  it('Mutation.updateEmployee meneruskan hasil mapping ke service', async () => {
    mockedService.updateEmployee.mockResolvedValue({ ...sampleEmployee, lastName: 'Wijaya' })

    const result = await mutationUpdateEmployee({}, { id: 1, input: { lastName: 'Wijaya' } })

    expect(mockedService.updateEmployee).toHaveBeenCalledWith(1, expect.objectContaining({ last_name: 'Wijaya' }))
    expect(result.lastName).toBe('Wijaya')
  })

  it('Mutation.deleteEmployee return true kalau sukses', async () => {
    mockedService.deleteEmployee.mockResolvedValue(undefined)

    const result = await mutationDeleteEmployee({}, { id: 1 })

    expect(result).toBe(true)
  })

  it('Employee.job memanggil jobLoader.load dengan jobId', async () => {
    const load = vi.fn().mockResolvedValue({ jobId: 1, jobTitle: 'Software Engineer' })
    const ctx = { loaders: { jobLoader: { load } } } as any

    await employeeJobResolver({ jobId: 1 }, {}, ctx)

    expect(load).toHaveBeenCalledWith(1)
  })

  it('Employee.manager return null kalau managerId null (loader TIDAK dipanggil)', async () => {
    const load = vi.fn()
    const ctx = { loaders: { employeeLoader: { load } } } as any

    const result = await employeeManagerResolver({ managerId: null }, {}, ctx)

    expect(result).toBeNull()
    expect(load).not.toHaveBeenCalled()
  })

  it('Employee.directReports memanggil directReportsLoader.load dengan employeeId', async () => {
    const load = vi.fn().mockResolvedValue([])
    const ctx = { loaders: { directReportsLoader: { load } } } as any

    await employeeDirectReportsResolver({ employeeId: 1 }, {}, ctx)

    expect(load).toHaveBeenCalledWith(1)
  })
})