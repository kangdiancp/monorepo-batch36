import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '../../../db';
import { payrollRuns, sagaInstances, sagaTasks, taskDefinitions, type SagaTaskStatus } from '../../../db/schema';
import { PAYROLL_TASK_CODE } from '../../saga/payroll-saga-tasks';
import { ensurePayrollTaskDefinitionsSeeded } from '../../saga/saga.repository';
import type { PayrollRunRow } from '../payroll-run.types';
import { GENERATE_TASK_CODES, PAYROLL_DOMAIN } from './payroll-generate.config';

export type TaskDefinitionRow = typeof taskDefinitions.$inferSelect;

/* Load data from taskdefinition */
export async function loadPayrollTaskDefinitions(): Promise<TaskDefinitionRow[]> {
  await ensurePayrollTaskDefinitionsSeeded();
  return db
    .select()
    .from(taskDefinitions)
    .where(and(eq(taskDefinitions.domain_context, PAYROLL_DOMAIN), eq(taskDefinitions.is_active, true)))
    .orderBy(asc(taskDefinitions.sequence_order));
}

/**
 * Satu transaksi atomic mulai dari draft -> processing
 */
export async function beginGenerate(
  runId: string,
  defs: TaskDefinitionRow[],
): Promise<{ run: PayrollRunRow; sagaId: string } | null> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [run] = await tx
      .update(payrollRuns)
      .set({ status: 'PROCESSING', started_at: now, completed_at: null })
      .where(and(eq(payrollRuns.run_id, runId), eq(payrollRuns.status, 'DRAFT')))
      .returning();
    if (!run) return null;

    const [saga] = await tx
      .insert(sagaInstances)
      .values({ domain_context: PAYROLL_DOMAIN, reference_id: run.run_code, status: 'IN_PROGRESS' })
      .onConflictDoUpdate({
        target: [sagaInstances.domain_context, sagaInstances.reference_id],
        set: { status: 'IN_PROGRESS', current_step_code: null },
      })
      .returning();
    const sagaId = saga!.saga_id;


    await tx.delete(sagaTasks).where(eq(sagaTasks.saga_id, sagaId));
    const rows: (typeof sagaTasks.$inferInsert)[] = defs.map((d) =>
      d.task_code === PAYROLL_TASK_CODE.RUN_PAYROLL
        ? { saga_id: sagaId, task_name: d.task_name, status: 'COMPLETED', started_at: now, completed_at: now }
        : { saga_id: sagaId, task_name: d.task_name, status: 'PENDING' },
    );
    await tx.insert(sagaTasks).values(rows);

    await tx.update(payrollRuns).set({ saga_id: sagaId }).where(eq(payrollRuns.run_id, runId));
    return { run, sagaId };
  });
}


export async function listGenerateTasks(sagaId: string) {
  const rows = await db
    .select({
      task_id: sagaTasks.task_id,
      task_name: sagaTasks.task_name,
      task_code: taskDefinitions.task_code,
      status: sagaTasks.status,
    })
    .from(sagaTasks)
    .innerJoin(
      taskDefinitions,
      and(eq(taskDefinitions.task_name, sagaTasks.task_name), eq(taskDefinitions.domain_context, PAYROLL_DOMAIN)),
    )
    .where(eq(sagaTasks.saga_id, sagaId));
  return rows.filter((r) => GENERATE_TASK_CODES.has(r.task_code));
}

export async function setTotalBatches(sagaId: string, totalBatches: number): Promise<void> {
  const ids = (await listGenerateTasks(sagaId)).map((t) => t.task_id);
  if (ids.length === 0) return;
  await db.update(sagaTasks).set({ input_payload: { total_batches: totalBatches } }).where(inArray(sagaTasks.task_id, ids));
}

export async function isTaskActive(taskId: string): Promise<boolean> {
  const [t] = await db.select({ status: sagaTasks.status }).from(sagaTasks).where(eq(sagaTasks.task_id, taskId));
  return !!t && (t.status === 'PENDING' || t.status === 'IN_PROGRESS');
}


export async function recordBatchDone(taskId: string, batchNo: number): Promise<SagaTaskStatus | null> {
  return db.transaction(async (tx) => {
    const [task] = await tx.select().from(sagaTasks).where(eq(sagaTasks.task_id, taskId)).for('update');
    if (!task || (task.status !== 'PENDING' && task.status !== 'IN_PROGRESS')) return null;

    const total = Number((task.input_payload as { total_batches?: number } | null)?.total_batches ?? 0);
    const done = new Set<number>((task.output_payload as { done_batches?: number[] } | null)?.done_batches ?? []);
    done.add(batchNo);

    const finished = total > 0 && done.size >= total;
    const now = new Date();
    await tx
      .update(sagaTasks)
      .set({
        status: finished ? 'COMPLETED' : 'IN_PROGRESS',
        output_payload: { done_batches: [...done] },
        started_at: task.started_at ?? now,
        completed_at: finished ? now : null,
        last_attempt_at: now,
      })
      .where(eq(sagaTasks.task_id, taskId));
    return finished ? 'COMPLETED' : 'IN_PROGRESS';
  });
}

export async function allGenerateTasksCompleted(sagaId: string): Promise<boolean> {
  const tasks = await listGenerateTasks(sagaId);
  return tasks.length === GENERATE_TASK_CODES.size && tasks.every((t) => t.status === 'COMPLETED');
}

export async function setCurrentStep(sagaId: string, stepCode: string): Promise<void> {
  await db.update(sagaInstances).set({ current_step_code: stepCode }).where(eq(sagaInstances.saga_id, sagaId));
}


export async function failRun(args: {
  runId: string;
  sagaId: string;
  failedTaskId?: string;
  reason: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const reverted = await tx
      .update(payrollRuns)
      .set({ status: 'DRAFT' })
      .where(
        and(eq(payrollRuns.run_id, args.runId), eq(payrollRuns.status, 'PROCESSING'), eq(payrollRuns.saga_id, args.sagaId)),
      )
      .returning({ run_id: payrollRuns.run_id });
    if (reverted.length === 0) return;

    await tx.update(sagaInstances).set({ status: 'FAILED' }).where(eq(sagaInstances.saga_id, args.sagaId));

    if (args.failedTaskId) {
      await tx
        .update(sagaTasks)
        .set({ status: 'FAILED', error_message: args.reason, completed_at: new Date() })
        .where(eq(sagaTasks.task_id, args.failedTaskId));
    }
    await tx
      .update(sagaTasks)
      .set({ status: 'SKIPPED' })
      .where(and(eq(sagaTasks.saga_id, args.sagaId), inArray(sagaTasks.status, ['PENDING', 'IN_PROGRESS'])));
  });
}

export async function getSagaStatus(sagaId: string) {
  const [s] = await db
    .select({ status: sagaInstances.status, current_step_code: sagaInstances.current_step_code })
    .from(sagaInstances)
    .where(eq(sagaInstances.saga_id, sagaId));
  return s ?? null;
}

export async function listTaskProgress(sagaId: string) {
  const rows = await db
    .select({
      task_name: sagaTasks.task_name,
      status: sagaTasks.status,
      input_payload: sagaTasks.input_payload,
      output_payload: sagaTasks.output_payload,
      started_at: sagaTasks.started_at,
      completed_at: sagaTasks.completed_at,
      error_message: sagaTasks.error_message,
    })
    .from(sagaTasks)
    .leftJoin(
      taskDefinitions,
      and(eq(taskDefinitions.task_name, sagaTasks.task_name), eq(taskDefinitions.domain_context, PAYROLL_DOMAIN)),
    )
    .where(eq(sagaTasks.saga_id, sagaId))
    .orderBy(asc(taskDefinitions.sequence_order));

  return rows.map((r) => ({
    task_name: r.task_name,
    status: r.status,
    total_batches: Number((r.input_payload as { total_batches?: number } | null)?.total_batches ?? 0),
    batches_done: ((r.output_payload as { done_batches?: number[] } | null)?.done_batches ?? []).length,
    started_at: r.started_at,
    completed_at: r.completed_at,
    error_message: r.error_message,
  }));
}