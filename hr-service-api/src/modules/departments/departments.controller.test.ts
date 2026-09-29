import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FastifyReply, FastifyRequest } from 'fastify'
import * as departmentService from './departments.service'
import * as departmentController from './departments.controller'
import type { DepartmentRow } from './departments.types'

vi.mock('./departments.service')

const mockedService = vi.mocked(departmentService)

const sampleDepartment: DepartmentRow = {
  departmentId: 1,
  departmentName: 'Engineering',
  locationId: null,
}

// Fake FastifyReply — cukup chainable status().send() 
// sendSuccess, tidak perlu instance Fastify beneran untuk unit test ini.
function createMockReply() {
  const reply = {
    status: vi.fn(),
    send: vi.fn(),
  } as unknown as FastifyReply
  vi.mocked(reply.status).mockReturnValue(reply)
  return reply
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('departments.controller', () => {
  it('listDepartments send 200 with data & pagination', async () => {
    const pagination = { page: 1, limit: 20, total: 1, totalPages: 1 }
    mockedService.listDepartments.mockResolvedValue({ items: [sampleDepartment], pagination })

    const request = { query: { page: 1, limit: 20 } } as FastifyRequest<any>
    const reply = createMockReply()

    await departmentController.listDepartments(request, reply)

    expect(reply.status).toHaveBeenCalledWith(200)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Departments retrieved successfully',
        data: [sampleDepartment],
        pagination,
      }),
    )
  })

  it('getDepartment send 200 with single department', async () => {
    mockedService.getDepartmentById.mockResolvedValue(sampleDepartment)

    const request = { params: { id: 1 } } as FastifyRequest<any>
    const reply = createMockReply()

    await departmentController.getDepartment(request, reply)

    expect(mockedService.getDepartmentById).toHaveBeenCalledWith(1)
    expect(reply.status).toHaveBeenCalledWith(200)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: sampleDepartment }),
    )
  })

  it('createDepartment send 201', async () => {
    mockedService.createDepartment.mockResolvedValue(sampleDepartment)

    const request = { body: { department_name: 'Engineering' } } as FastifyRequest<any>
    const reply = createMockReply()

    await departmentController.createDepartment(request, reply)

    expect(mockedService.createDepartment).toHaveBeenCalledWith({ department_name: 'Engineering' })
    expect(reply.status).toHaveBeenCalledWith(201)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Department created successfully', data: sampleDepartment }),
    )
  })

  it('updateDepartment send 200 with department ter-update', async () => {
    const updated = { ...sampleDepartment, departmentName: 'Ops' }
    mockedService.updateDepartment.mockResolvedValue(updated)

    const request = {
      params: { id: 1 },
      body: { department_name: 'Ops' },
    } as FastifyRequest<any>
    const reply = createMockReply()

    await departmentController.updateDepartment(request, reply)

    expect(mockedService.updateDepartment).toHaveBeenCalledWith(1, { department_name: 'Ops' })
    expect(reply.status).toHaveBeenCalledWith(200)
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ data: updated }))
  })

  it('deleteDepartment send 200 with data null', async () => {
    mockedService.deleteDepartment.mockResolvedValue(undefined)

    const request = { params: { id: 1 } } as FastifyRequest<any>
    const reply = createMockReply()

    await departmentController.deleteDepartment(request, reply)

    expect(mockedService.deleteDepartment).toHaveBeenCalledWith(1)
    expect(reply.status).toHaveBeenCalledWith(200)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Department deleted successfully', data: null }),
    )
  })

  it('forward error dari service (mis. ApiError.notFound) ke caller', async () => {
    mockedService.getDepartmentById.mockRejectedValue(new Error('Department not found'))

    const request = { params: { id: 999 } } as FastifyRequest<any>
    const reply = createMockReply()

    await expect(departmentController.getDepartment(request, reply)).rejects.toThrow('Department not found')
  })
})