import { UnrecoverableError, Worker, type FlowJob, type Job } from 'bullmq';
import * as calc from './payroll-generate.calc.repository';
import type { BatchRange, BatchScope } from './payroll-generate.calc.repository';
import * as payrollRunRepository from '../payroll-run.repository';
import type { PayrollRunRow } from '../payroll-run.types';
import * as saga from './payroll-generate.saga.repository';
import { BATCH_SIZE, CALC_TASKS, TASK } from './payroll-generate.config';
import {
  DEFAULT_JOB_OPTS,
  JOB_FINALIZE_RUN,
  JOB_PLAN_RUN,
  QUEUE_NAMES,
  closePayrollQueues,
  connection,
  getFlowProducer,
  type BatchJobData,
  type RunJobData,
} from './payroll-generate.queue';



class StaleJobError extends UnrecoverableError {}

const BATCH_HANDLERS: Record<string, (s: BatchScope) => Promise<number>> = {
  [TASK.calcAttendance.job]: calc.calcAttendance,
  [TASK.calcBusinessTrip.job]: calc.calcBusinessTrip,
  [TASK.calcOvertime.job]: calc.calcOvertime,
  [TASK.calcHealthInsurance.job]: calc.calcHealthInsurance,
  [TASK.generatePayroll.job]: calc.generatePayroll,
};

// Mulai atur planRun

async function planRun(d: RunJobData): Promise<{ employees: number; batches: number }> {
  const run = await payrollRunRepository.findById(d.runId);
  if (!run || run.status !== 'PROCESSING' || run.saga_id !== d.sagaId) {
    throw new StaleJobError(`Run ${d.runId} tidak lagi PROCESSING untuk saga ${d.sagaId}`);
  }

  const conflicts = await calc.countConflictingHistory(run);
  if (conflicts > 0) {
    throw new UnrecoverableError(
      `${conflicts} employee sudah punya payroll_history periode ${run.period_month}/${run.period_year} dari run lain`,
    );
  }

  await calc.removeStaleDraftRows(run);
  const employees = await calc.upsertHistoryRows(run);
  if (employees === 0) {
    throw new UnrecoverableError('Tidak ada employee eligible (ACTIVE) untuk run ini');
  }

  const batches = await calc.findBatches(run.run_id, BATCH_SIZE);
  const tasks = await saga.listGenerateTasks(d.sagaId);
  await saga.setTotalBatches(d.sagaId, batches.length);

  const taskIdByCode = new Map(tasks.map((t) => [t.task_code, t.task_id]));

  await getFlowProducer().add(buildFlow(run, d.sagaId, batches, taskIdByCode));

  return { employees, batches: batches.length };
}

function buildFlow(
  run: PayrollRunRow,
  sagaId: string,
  batches: BatchRange[],
  taskIdByCode: Map<string, string>,
): FlowJob {

  const childOpts = { ...DEFAULT_JOB_OPTS, failParentOnFailure: true };

  const data = (code: string, b: BatchRange, batchNo: number): BatchJobData => {
    const taskId = taskIdByCode.get(code);
    if (!taskId) throw new UnrecoverableError(`saga_task untuk ${code} tidak ditemukan (seed task_definitions?)`);
    return {
      runId: run.run_id,
      sagaId,
      taskId,
      batchNo,
      fromId: b.from_id,
      toId: b.to_id,
      periodMonth: run.period_month,
      periodYear: run.period_year,
    };
  };

  return {
    name: JOB_FINALIZE_RUN,
    queueName: QUEUE_NAMES.orchestrator,
    data: { runId: run.run_id, sagaId } satisfies RunJobData,
    opts: { ...DEFAULT_JOB_OPTS },
    children: batches.map((b, i) => ({
      name: TASK.generatePayroll.job,
      queueName: QUEUE_NAMES.batch,
      data: data(TASK.generatePayroll.code, b, i),
      opts: childOpts,
      children: CALC_TASKS.map((t) => ({
        name: t.job,
        queueName: QUEUE_NAMES.batch,
        data: data(t.code, b, i),
        opts: childOpts,
      })),
    })),
  };
}

async function finalizeRun(d: RunJobData): Promise<void> {
  if (!(await saga.allGenerateTasksCompleted(d.sagaId))) {
    throw new Error('Belum semua saga_task COMPLETED'); // bukan Unrecoverable -> di-retry
  }
  const ok = await calc.finalizeRunTotals(d.runId, d.sagaId);
  if (!ok) throw new StaleJobError(`Run ${d.runId} tidak bisa difinalisasi (status/saga berubah)`);
  await saga.setCurrentStep(d.sagaId, TASK.generatePayroll.code);
}

async function processOrchestrator(job: Job<RunJobData>) {
  switch (job.name) {
    case JOB_PLAN_RUN:
      return planRun(job.data);
    case JOB_FINALIZE_RUN:
      return finalizeRun(job.data);
    default:
      throw new UnrecoverableError(`Job tidak dikenal: ${job.name}`);
  }
}


async function processBatch(job: Job<BatchJobData>) {
  const d = job.data;
  const handler = BATCH_HANDLERS[job.name];
  if (!handler) throw new UnrecoverableError(`Job tidak dikenal: ${job.name}`);

  if (!(await saga.isTaskActive(d.taskId))) {
    throw new StaleJobError(`Task ${d.taskId} sudah tidak aktif (generasi lama / run gagal)`);
  }

  const affected = await handler({
    runId: d.runId,
    fromId: d.fromId,
    toId: d.toId,
    periodMonth: d.periodMonth,
    periodYear: d.periodYear,
  });

  const status = await saga.recordBatchDone(d.taskId, d.batchNo);
  if (status === null) throw new StaleJobError(`Task ${d.taskId} berubah status saat diproses`);
  if (status === 'COMPLETED') console.log(`[payroll-worker] task ${job.name} selesai (semua batch)`);

  return { affected };
}


async function onJobFailed(job: Job | undefined, err: Error): Promise<void> {
  if (!job) return;
  if (err instanceof StaleJobError) {
    console.warn(`[payroll-worker] skip ${job.name} ${job.id}: ${err.message}`);
    return;
  }

  const isFinal = err instanceof UnrecoverableError || job.attemptsMade >= (job.opts.attempts ?? 1);
  if (!isFinal) {
    console.warn(`[payroll-worker] ${job.name} ${job.id} gagal (percobaan ${job.attemptsMade}), akan di-retry: ${err.message}`);
    return;
  }

  const { runId, sagaId, taskId } = job.data as Partial<BatchJobData> & RunJobData;
  console.error(`[payroll-worker] ${job.name} ${job.id} GAGAL PERMANEN: ${err.message}`);
  try {
    await saga.failRun({ runId, sagaId, failedTaskId: taskId, reason: `${job.name}: ${err.message}` });
  } catch (e) {
    console.error('[payroll-worker] gagal menjalankan kompensasi failRun:', e);
  }
}



export function startPayrollRunWorkers() {
  const orchestrator = new Worker<RunJobData>(QUEUE_NAMES.orchestrator, processOrchestrator, {
    connection,
    concurrency: 2,
  });
  // Konkurensi batch <= ukuran pool DB (DB_POOL_MAX, default 10).
  const batch = new Worker<BatchJobData>(QUEUE_NAMES.batch, processBatch, {
    connection,
    concurrency: Number(process.env.PAYROLL_BATCH_CONCURRENCY ?? 4),
  });

  orchestrator.on('completed', (job, result) =>
    console.log(`[payroll-worker] ${job.name} OK run=${job.data.runId}`, result ?? ''),
  );
  for (const w of [orchestrator, batch]) {
    w.on('failed', (job, err) => void onJobFailed(job, err));
    w.on('error', (err) => console.error('[payroll-worker] worker error:', err));
  }

  console.log(`[payroll-worker] started (batch size ${BATCH_SIZE}, batch concurrency ${batch.opts.concurrency})`);

  return {
    close: async () => {
      await Promise.all([orchestrator.close(), batch.close()]); // tunggu job aktif selesai
      await closePayrollQueues();
    },
  };
}