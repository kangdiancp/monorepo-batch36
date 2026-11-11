import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendSuccess } from '../../common/utils/api-response';
import * as generateService from './generate/payroll-generate.service';
import * as payrollRunService from './payroll-run.service';
import type {
  ApprovePayrollRunInput,
  CancelPayrollRunInput,
  CreatePayrollRunInput,
  ListPayrollRunQuery,
  PayrollRunIdParam,
  UpdatePayrollRunInput,
} from './payroll-run.schema';

export async function listPayrollRuns(
  request: FastifyRequest<{ Querystring: ListPayrollRunQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const { items, pagination } = await payrollRunService.listPayrollRuns(request.query);
  sendSuccess(reply, items, 'Daftar payroll run berhasil diambil', 200, pagination);
}

export async function getPayrollRun(
  request: FastifyRequest<{ Params: PayrollRunIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  const run = await payrollRunService.getPayrollRunById(request.params.id);
  sendSuccess(reply, run, 'Detail payroll run berhasil diambil');
}

export async function createPayrollRun(
  request: FastifyRequest<{ Body: CreatePayrollRunInput }>,
  reply: FastifyReply,
): Promise<void> {
  const run = await payrollRunService.createPayrollRun(request.body);
  sendSuccess(reply, run, 'Payroll run berhasil dibuat', 201);
}

export async function updatePayrollRun(
  request: FastifyRequest<{ Params: PayrollRunIdParam; Body: UpdatePayrollRunInput }>,
  reply: FastifyReply,
): Promise<void> {
  const run = await payrollRunService.updatePayrollRun(request.params.id, request.body);
  sendSuccess(reply, run, 'Payroll run berhasil diupdate');
}


// 202 Accepted: pekerjaan DITERIMA & masuk antrean, belum selesai. Pantau lewat GET /:id/progress.
export async function generatePayrollRun(
  request: FastifyRequest<{ Params: PayrollRunIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  const result = await generateService.generatePayrollRun(request.params.id);
  sendSuccess(reply, result, 'Generate payroll accepted dan sedang diproses di background', 202);
}

export async function getPayrollRunProgress(
  request: FastifyRequest<{ Params: PayrollRunIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  const progress = await generateService.getPayrollRunProgress(request.params.id);
  sendSuccess(reply, progress, 'Progress generate payroll berhasil diambil');
}

export async function approvePayrollRun(
  request: FastifyRequest<{ Params: PayrollRunIdParam; Body: ApprovePayrollRunInput }>,
  reply: FastifyReply,
): Promise<void> {
  const run = await payrollRunService.approvePayrollRun(request.params.id, request.body.approved_by);
  sendSuccess(reply, run, 'Payroll run berhasil di-approve');
}

export async function cancelPayrollRun(
  request: FastifyRequest<{ Params: PayrollRunIdParam; Body: CancelPayrollRunInput }>,
  reply: FastifyReply,
): Promise<void> {
  const run = await payrollRunService.cancelPayrollRun(request.params.id, request.body);
  sendSuccess(reply, run, 'Payroll run berhasil dibatalkan');
}

export async function deletePayrollRun(
  request: FastifyRequest<{ Params: PayrollRunIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  await payrollRunService.deletePayrollRun(request.params.id);
  sendSuccess(reply, null, 'Payroll run berhasil dihapus');
}

export async function getEligibleEmployees(
  request: FastifyRequest<{ Params: PayrollRunIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  const result = await payrollRunService.getEligibleEmployees(request.params.id);
  sendSuccess(reply, result, 'Daftar employee eligible berhasil diambil dari hr-service-api (via gRPC)');
}
