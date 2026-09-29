import { ApiError } from '../../common/utils/api-error';
import type { Pagination } from '../../common/utils/api-response';
import * as departmentRepository from './departments.repository';
import type { CreateDepartmentInput, ListDepartmentQuery, UpdateDepartmentInput } from './departments.schema';
import type { DepartmentRow } from './departments.types';

export async function listDepartments(
  filter: ListDepartmentQuery,
): Promise<{ items: DepartmentRow[]; pagination: Pagination }> {
  const { rows, total } = await departmentRepository.findAll(filter);

  return {
    items: rows,
    pagination: {
      page: filter.page,
      limit: filter.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filter.limit)),
    },
  };
}

export async function getDepartmentById(id: number): Promise<DepartmentRow> {
  const department = await departmentRepository.findById(id);
  if (!department) {
    throw ApiError.notFound(`Department with id ${id} not found`);
  }
  return department;
}

export async function createDepartment(input: CreateDepartmentInput): Promise<DepartmentRow> {
  return departmentRepository.create({
    ...input,
    department_name: input.department_name.trim(),
  });
}

export async function updateDepartment(id: number, input: UpdateDepartmentInput): Promise<DepartmentRow> {
  const existing = await departmentRepository.findById(id);
  if (!existing) {
    throw ApiError.notFound(`Department with id ${id} not found`);
  }

  const updated = await departmentRepository.update(id, {
    ...input,
    department_name: input.department_name?.trim(),
  });

  if (!updated) {
    throw ApiError.notFound(`Department with id ${id} not found`);
  }
  return updated;
}

export async function deleteDepartment(id: number): Promise<void> {
  const existing = await departmentRepository.findById(id);
  if (!existing) {
    throw ApiError.notFound(`Department with id ${id} not found`);
  }

  await departmentRepository.remove(id);
}