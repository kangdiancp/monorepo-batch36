import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as departmentRepository from './departments.repository'
import * as departmentService from './departments.service'
import { ApiError } from '../../common/utils/api-error'
import type { DepartmentRow } from './departments.types'

// Mock seluruh repository 
// cukup di mock doang
vi.mock('./departments.repository')

const mockedRepo = vi.mocked(departmentRepository)

// arrange datanya
const sampleDepartment: DepartmentRow = {
  departmentId: 1,
  departmentName: 'Engineering',
  locationId: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('departments.service', () => {
  describe('listDepartments', () => {
    it('menghitung pagination dengan benar', async () => {


      mockedRepo.findAll.mockResolvedValue({ rows: [sampleDepartment], total: 45 })

      //arrange
      const result = await departmentService.listDepartments({ page: 2, limit: 20 })

      //assert
      expect(mockedRepo.findAll).toHaveBeenCalledWith({ page: 2, limit: 20 })
      expect(result.items).toEqual([sampleDepartment])
      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3, 
      })
    })

    it('totalPages minimal 1 walau total 0', async () => {
      mockedRepo.findAll.mockResolvedValue({ rows: [], total: 0 })

      const result = await departmentService.listDepartments({ page: 1, limit: 20 })

      expect(result.pagination.totalPages).toBe(1)
    })
  })

  describe('getDepartmentById', () => {
    it('return department if found', async () => {
      //arrage
      mockedRepo.findById.mockResolvedValue(sampleDepartment)

      const result = await departmentService.getDepartmentById(1)

      expect(result).toEqual(sampleDepartment)
      expect(mockedRepo.findById).toHaveBeenCalledWith(1)
    })

    it('throw ApiError.notFound kalau tidak ditemukan', async () => {
      mockedRepo.findById.mockResolvedValue(null)

      await expect(departmentService.getDepartmentById(999)).rejects.toThrow(ApiError)
    })
  })

  describe('createDepartment', () => {
    it('trim department_name before insert', async () => {
      mockedRepo.create.mockResolvedValue(sampleDepartment)

      await departmentService.createDepartment({
        department_name: '  Engineering  ',
        location_id: null,
      })

      expect(mockedRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ department_name: 'Engineering' }),
      )
    })
  })

  describe('updateDepartment', () => {
    it('throw notFound kalau department tidak ada (tanpa panggil update)', async () => {
      mockedRepo.findById.mockResolvedValue(null)

      await expect(
        departmentService.updateDepartment(999, { department_name: 'X' }),
      ).rejects.toThrow(ApiError)

      expect(mockedRepo.update).not.toHaveBeenCalled()
    })

    it('trim department_name kalau dikirim, dan tidak crash kalau undefined', async () => {
      mockedRepo.findById.mockResolvedValue(sampleDepartment)
      mockedRepo.update.mockResolvedValue({ ...sampleDepartment, departmentName: 'Ops' })

      await departmentService.updateDepartment(1, { department_name: '  Ops  ' })

      expect(mockedRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ department_name: 'Ops' }),
      )
    })

    it('throw notFound kalau update return null', async () => {
      mockedRepo.findById.mockResolvedValue(sampleDepartment)
      mockedRepo.update.mockResolvedValue(null)

      await expect(
        departmentService.updateDepartment(1, { department_name: 'X' }),
      ).rejects.toThrow(ApiError)
    })
  })

  describe('deleteDepartment', () => {
    it('throw notFound kalau department tidak ada', async () => {
      mockedRepo.findById.mockResolvedValue(null)

      await expect(departmentService.deleteDepartment(999)).rejects.toThrow(ApiError)
      expect(mockedRepo.remove).not.toHaveBeenCalled()
    })

    it('panggil repository.remove kalau department ada', async () => {
      mockedRepo.findById.mockResolvedValue(sampleDepartment)
      mockedRepo.remove.mockResolvedValue(true)

      await departmentService.deleteDepartment(1)

      expect(mockedRepo.remove).toHaveBeenCalledWith(1)
    })
  })
})