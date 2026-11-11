import { ApiError } from '../../../common/utils/api-error';
import * as payrollRunRepository from '../payroll-run.repository';
import type { PayrollRunRow } from '../payroll-run.types';
import { GENERATE_TASK_CODES } from './payroll-generate.config';
import { enqueuePlanRun } from './payroll-generate.queue';
import * as sagaRepository from './payroll-generate.saga.repository';

export async function generatePayrollRun(id: string): Promise<{ run: PayrollRunRow; saga_id: string }> {
  const run = await payrollRunRepository.findById(id);
  if (!run) throw ApiError.notFound(`Payroll run dengan id ${id} tidak ditemukan`);
  if (run.status !== 'DRAFT') {
    throw ApiError.conflict(`Payroll run berstatus ${run.status} tidak bisa di-generate — harus DRAFT`);
  }
  if (run.run_type !== 'REGULAR') {

    throw ApiError.badRequest(`Generate otomatis baru mendukung run_type REGULAR (run ini ${run.run_type})`);
  }

  // Seed otomatis (idempotent) — tidak butuh script SQL terpisah lagi.
  // bisa di comment jika data udah diinsert di table pake sql.
  const defs = await sagaRepository.loadPayrollTaskDefinitions();
  const known = new Set(defs.map((d) => d.task_code));
  const missing = [...GENERATE_TASK_CODES].filter((c) => !known.has(c));
  if (missing.length > 0) {
    throw ApiError.internal(`task_definitions PAYROLL nonaktif/hilang untuk: ${missing.join(', ')}`);
  }

  const begun = await sagaRepository.beginGenerate(id, defs);
  if (!begun) throw ApiError.conflict('Payroll run sudah berubah status, generate dibatalkan');

  try {
    await enqueuePlanRun({ runId: id, sagaId: begun.sagaId });
  } catch (err) {
    // DB sudah PROCESSING tapi job tidak masuk antrean (mis. Redis down) -> di retry lagi.
    await sagaRepository.failRun({ runId: id, sagaId: begun.sagaId, reason: `Gagal enqueue: ${(err as Error).message}` });
    throw ApiError.internal('Gagal memasukkan job ke antrean (Redis tidak tersedia?)');
  }

  return { run: begun.run, saga_id: begun.sagaId };
}

export async function getPayrollRunProgress(id: string) {
  const run = await payrollRunRepository.findById(id);
  if (!run) throw ApiError.notFound(`Payroll run dengan id ${id} tidak ditemukan`);

  if (!run.saga_id) {
    return { run_id: id, run_status: run.status, saga_id: null, saga_status: null, progress_percent: 0, tasks: [] };
  }

  const [sagaInfo, tasks] = await Promise.all([
    sagaRepository.getSagaStatus(run.saga_id),
    sagaRepository.listTaskProgress(run.saga_id),
  ]);

  const total = tasks.reduce((s, t) => s + t.total_batches, 0);
  const done = tasks.reduce((s, t) => s + t.batches_done, 0);

  return {
    run_id: id,
    run_status: run.status,
    saga_id: run.saga_id,
    saga_status: sagaInfo?.status ?? null,
    current_step_code: sagaInfo?.current_step_code ?? null,
    progress_percent: total > 0 ? Math.round((done / total) * 100) : 0,
    tasks,
  };
}