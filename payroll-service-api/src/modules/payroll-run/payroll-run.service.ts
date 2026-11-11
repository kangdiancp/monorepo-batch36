import { status as grpcStatus } from '@grpc/grpc-js';
import { ApiError } from '../../common/utils/api-error';
import type { Pagination } from '../../common/utils/api-response';
import * as hrClient from '../../grpc/hr-client';
import { HrClientError } from '../../grpc/hr-client';
import type { EmployeeMessage } from '../../grpc/hr.types';
import * as payrollRunRepository from './payroll-run.repository';
import type {
  CancelPayrollRunInput,
  CreatePayrollRunInput,
  ListPayrollRunQuery,
  UpdatePayrollRunInput,
} from './payroll-run.schema';
import type { PayrollRunRow, PayrollRunWithRelationsRow } from './payroll-run.types';

export async function listPayrollRuns(
  filter: ListPayrollRunQuery,
): Promise<{ items: PayrollRunRow[]; pagination: Pagination }> {
  const { rows, total } = await payrollRunRepository.findAll(filter);

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

export async function getPayrollRunById(id: string): Promise<PayrollRunWithRelationsRow> {
  const run = await payrollRunRepository.findByIdWithRelations(id);
  if (!run) {
    throw ApiError.notFound(`Payroll run dengan id ${id} tidak ditemukan`);
  }
  return run;
}

export async function createPayrollRun(input: CreatePayrollRunInput): Promise<PayrollRunRow> {

  return payrollRunRepository.create(input);
}

export async function updatePayrollRun(id: string, input: UpdatePayrollRunInput): Promise<PayrollRunRow> {
  const existing = await payrollRunRepository.findById(id);
  if (!existing) {
    throw ApiError.notFound(`Payroll run dengan id ${id} tidak ditemukan`);
  }
  if (existing.status !== 'DRAFT') {
    throw ApiError.conflict(
      `Payroll run berstatus ${existing.status} tidak bisa diedit — hanya status DRAFT yang boleh diubah`,
    );
  }

  const updated = await payrollRunRepository.updateDraftFields(id, input);
  if (!updated) {
    throw ApiError.conflict('Payroll run sudah berubah status, update dibatalkan');
  }
  return updated;
}



export async function approvePayrollRun(id: string, approvedBy: number): Promise<PayrollRunRow> {
  const existing = await payrollRunRepository.findById(id);
  if (!existing) {
    throw ApiError.notFound(`Payroll run dengan id ${id} tidak ditemukan`);
  }
  if (existing.status !== 'REVIEW') {
    throw ApiError.conflict(
      `Payroll run berstatus ${existing.status} tidak bisa di-approve — harus berstatus REVIEW`,
    );
  }

  const updated = await payrollRunRepository.approve(id, approvedBy);
  if (!updated) {
    throw ApiError.conflict('Payroll run sudah berubah status, approve dibatalkan');
  }
  return updated;
}

export async function cancelPayrollRun(id: string, input: CancelPayrollRunInput): Promise<PayrollRunRow> {
  const existing = await payrollRunRepository.findById(id);
  if (!existing) {
    throw ApiError.notFound(`Payroll run dengan id ${id} tidak ditemukan`);
  }
  if (['PAID', 'PAID_WITH_EXCEPTION', 'CANCELLED'].includes(existing.status)) {
    throw ApiError.conflict(`Payroll run berstatus ${existing.status} tidak bisa dibatalkan`);
  }

  const updated = await payrollRunRepository.cancel(id, input.cancelled_by, input.cancel_reason);
  if (!updated) {
    throw ApiError.conflict('Payroll run sudah berubah status, pembatalan dibatalkan');
  }
  return updated;
}

export async function deletePayrollRun(id: string): Promise<void> {
  const existing = await payrollRunRepository.findById(id);
  if (!existing) {
    throw ApiError.notFound(`Payroll run dengan id ${id} tidak ditemukan`);
  }
  if (existing.status !== 'DRAFT') {
    throw ApiError.conflict(
      `Payroll run berstatus ${existing.status} tidak bisa dihapus — hanya status DRAFT yang boleh dihapus`,
    );
  }

  const deleted = await payrollRunRepository.remove(id);
  if (!deleted) {
    throw ApiError.conflict('Payroll run sudah berubah status, penghapusan dibatalkan');
  }
}

export interface EligibleEmployeesResult {
  department_id: number;
  total: number;
  employees: EmployeeMessage[];
}

/**
 * Eligible digunakan sebelum generate payroll, tujuannyan
 * untuk review employee yg memenuhi syarat, nah jika sudah okay, baru admin generate payroll
 */
export async function getEligibleEmployees(runId: string): Promise<EligibleEmployeesResult> {
  const run = await payrollRunRepository.findById(runId);
  if (!run) {
    throw ApiError.notFound(`Payroll run dengan id ${runId} tidak ditemukan`);
  }
  if (run.department_id === null) {
    throw ApiError.badRequest(
      'Payroll run ini company-wide (department_id kosong) — preview eligible employees cuma didukung untuk run per-department',
    );
  }

  let employees: EmployeeMessage[];
  try {
    employees = await hrClient.listActiveEmployeesByDepartment(run.department_id);
  } catch (err) {
    if (err instanceof HrClientError) {
      // jika grpc ga nyala, kita lempar kesinis
      throw err.code === grpcStatus.NOT_FOUND
        ? ApiError.notFound(`Department tidak ditemukan di hr-service-api: ${err.message}`)
        : ApiError.internal(`Gagal mengambil data employee dari hr-service-api: ${err.message}`);
    }
    throw err;
  }

  return { department_id: run.department_id, total: employees.length, employees };
}
