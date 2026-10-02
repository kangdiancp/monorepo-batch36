import { ApiError } from '../../common/utils/api-error';
import type { Pagination } from '../../common/utils/api-response';
import * as employeeRepository from './employees.repository';
import type { CreateEmployeeInput, ListEmployeeQuery, UpdateEmployeeInput } from './employees.schema';
import type { EmployeeApiRow } from './employees.types';

export async function listEmployees(
  filter: ListEmployeeQuery,
): Promise<{ items: EmployeeApiRow[]; pagination: Pagination }> {
  const { rows, total } = await employeeRepository.findAll(filter);

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

export async function getEmployeeById(id: number): Promise<EmployeeApiRow> {
  const employee = await employeeRepository.findById(id);
  if (!employee) {
    throw ApiError.notFound(`Employee with id ${id} not found`);
  }
  return employee;
}

export async function createEmployee(input: CreateEmployeeInput): Promise<EmployeeApiRow> {
  // ck_employees_termination_date: terminationDate >= hireDate. Cross-field,
  // tidak bisa divalidasi lewat JSON Schema — dicek manual di sini SEBELUM
  // insert, supaya error-nya jelas (bukan cuma "DB constraint violation").
  if (input.termination_date && input.termination_date < input.hire_date) {
    throw ApiError.badRequest('termination_date tidak boleh lebih awal dari hire_date');
  }

  return employeeRepository.create({
    ...input,
    first_name: input.first_name?.trim() ?? input.first_name,
    last_name: input.last_name.trim(),
    email: input.email.trim().toLowerCase(),
  });
}

export async function updateEmployee(id: number, input: UpdateEmployeeInput): Promise<EmployeeApiRow> {
  const existing = await employeeRepository.findById(id);
  if (!existing) {
    throw ApiError.notFound(`Employee with id ${id} not found`);
  }

  // Employee tidak boleh jadi manager untuk dirinya sendiri.
  if (input.manager_id !== undefined && input.manager_id === id) {
    throw ApiError.badRequest('Employee tidak bisa menjadi manager untuk dirinya sendiri');
  }

  // Cross-field date check — pakai nilai baru kalau dikirim, kalau tidak
  // fallback ke nilai existing (karena PATCH bisa cuma kirim salah satu).
  const effectiveHireDate = input.hire_date ?? existing.hireDate;
  const effectiveTerminationDate =
    input.termination_date !== undefined ? input.termination_date : existing.terminationDate;

  if (effectiveTerminationDate && effectiveTerminationDate < effectiveHireDate) {
    throw ApiError.badRequest('termination_date tidak boleh lebih awal dari hire_date');
  }

  const updated = await employeeRepository.update(id, {
    ...input,
    first_name: input.first_name !== undefined ? (input.first_name?.trim() ?? input.first_name) : undefined,
    last_name: input.last_name !== undefined ? input.last_name.trim() : undefined,
    email: input.email !== undefined ? input.email.trim().toLowerCase() : undefined,
  });

  if (!updated) {
    throw ApiError.notFound(`Employee with id ${id} not found`);
  }
  return updated;
}

/**
 * CATATAN: menghapus employee akan CASCADE ke dependents, employee_bank_accounts,
 * dan employee_files (semua onDelete: cascade — ikut terhapus). Employee lain
 * yang punya managerId ke sini akan otomatis di-set NULL (onDelete: set null).
 * Kalau kamu butuh konfirmasi ekstra sebelum hapus (mengingat efek berantai
 * ini), tambahkan pengecekan/warning di controller sebelum panggil ini.
 */
export async function deleteEmployee(id: number): Promise<void> {
  const existing = await employeeRepository.findById(id);
  if (!existing) {
    throw ApiError.notFound(`Employee with id ${id} not found`);
  }

  await employeeRepository.remove(id);
}