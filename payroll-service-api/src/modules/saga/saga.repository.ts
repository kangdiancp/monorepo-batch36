import { and, asc, count, desc, eq, type SQL } from 'drizzle-orm';
import { db } from '../../db';
import type { SagaStatus, SagaTaskStatus } from '../../db/schema';
import { sagaInstances, sagaTasks, taskDefinitions } from '../../db/schema';
import { PAYROLL_SAGA_TASK_DEFINITIONS } from './payroll-saga-tasks';
import type { ListSagaInstanceQuery } from './saga.schema';
import type { SagaInstanceRow, SagaInstanceWithTasksRow, SagaTaskRow, SagaTaskWithSequenceRow } from './saga.types';

/**
 * Pastikan 12 `task_definitions` domain PAYROLL sudah ada di
 * database (insert kalau belum ada, no-op kalau sudah — via unique constraint
 * `domain_context+task_code`). Dipanggil otomatis tiap `createInstance()`,
 * jadi starter ini tidak butuh migration/seed script terpisah.
 */
export async function ensurePayrollTaskDefinitionsSeeded(): Promise<void> {
  await db
    .insert(taskDefinitions)
    .values(PAYROLL_SAGA_TASK_DEFINITIONS)
    .onConflictDoNothing({ target: [taskDefinitions.domain_context, taskDefinitions.task_code] });
}

/**
 * Bikin saga instance baru + generate SEMUA `saga_tasks`-nya sekaligus,
 * diambil dari `task_definitions` sesuai payroll-id yg sama
 */
export async function createInstance(domainContext: string, referenceId: string): Promise<SagaInstanceWithTasksRow> {
  await ensurePayrollTaskDefinitionsSeeded();

  return db.transaction(async (tx) => {
    const [instance] = await tx
      .insert(sagaInstances)
      .values({ domain_context: domainContext, reference_id: referenceId })
      .returning();

    const definitions = await tx
      .select()
      .from(taskDefinitions)
      .where(and(eq(taskDefinitions.domain_context, domainContext), eq(taskDefinitions.is_active, true)))
      .orderBy(asc(taskDefinitions.sequence_order));

    let tasks: SagaTaskWithSequenceRow[] = [];
    if (definitions.length > 0) {
      const insertedTasks = await tx
        .insert(sagaTasks)
        .values(definitions.map((def) => ({ saga_id: instance!.saga_id, task_name: def.task_name })))
        .returning();

      // `.returning()` tidak jamin urutan taskname sesuai data yg diinsert
      const sequenceByTaskName = new Map(definitions.map((def) => [def.task_name, def.sequence_order]));
      tasks = insertedTasks
        .map((task) => ({ ...task, sequence_order: sequenceByTaskName.get(task.task_name) ?? null }))
        .sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));
    }

    return { ...instance!, tasks };
  });
}

export async function findById(id: string): Promise<SagaInstanceRow | null> {
  const [row] = await db.select().from(sagaInstances).where(eq(sagaInstances.saga_id, id));
  return row ?? null;
}

export async function findByIdWithTasks(id: string): Promise<SagaInstanceWithTasksRow | null> {
  const instance = await findById(id);
  if (!instance) {
    return null;
  }

  const tasks = await db
    .select({
      task_id: sagaTasks.task_id,
      saga_id: sagaTasks.saga_id,
      task_name: sagaTasks.task_name,
      status: sagaTasks.status,
      assigned_to_emp_id: sagaTasks.assigned_to_emp_id,
      started_at: sagaTasks.started_at,
      completed_at: sagaTasks.completed_at,
      due_date: sagaTasks.due_date,
      input_payload: sagaTasks.input_payload,
      output_payload: sagaTasks.output_payload,
      error_message: sagaTasks.error_message,
      retry_count: sagaTasks.retry_count,
      last_attempt_at: sagaTasks.last_attempt_at,
      created_at: sagaTasks.created_at,
      sequence_order: taskDefinitions.sequence_order,
    })
    .from(sagaTasks)
    .leftJoin(
      taskDefinitions,
      and(
        eq(taskDefinitions.domain_context, instance.domain_context),
        eq(taskDefinitions.task_name, sagaTasks.task_name),
      ),
    )
    .where(eq(sagaTasks.saga_id, id))
    .orderBy(asc(taskDefinitions.sequence_order));

  return { ...instance, tasks };
}

export async function findAll(
  filter: ListSagaInstanceQuery,
): Promise<{ rows: SagaInstanceRow[]; total: number }> {
  const { page, limit, domain_context, status } = filter;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];
  if (domain_context) conditions.push(eq(sagaInstances.domain_context, domain_context));
  if (status) conditions.push(eq(sagaInstances.status, status));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(sagaInstances)
      .where(whereClause)
      .orderBy(desc(sagaInstances.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(sagaInstances).where(whereClause),
  ]);

  return { rows, total: totalRow[0]?.total ?? 0 };
}

export async function findTaskById(sagaId: string, taskId: string): Promise<SagaTaskRow | null> {
  const [row] = await db
    .select()
    .from(sagaTasks)
    .where(and(eq(sagaTasks.saga_id, sagaId), eq(sagaTasks.task_id, taskId)));
  return row ?? null;
}

export async function updateTaskStatus(
  taskId: string,
  status: SagaTaskStatus,
  opts: { errorMessage?: string; assignedToEmpId?: number } = {},
): Promise<SagaTaskRow | null> {
  const updateData: Partial<typeof sagaTasks.$inferInsert> = { status, last_attempt_at: new Date() };

  if (status === 'IN_PROGRESS') {
    updateData.started_at = new Date();
  }
  if (status === 'COMPLETED' || status === 'FAILED') {
    updateData.completed_at = new Date();
  }
  if (opts.errorMessage !== undefined) {
    updateData.error_message = opts.errorMessage;
  }
  if (opts.assignedToEmpId !== undefined) {
    updateData.assigned_to_emp_id = opts.assignedToEmpId;
  }

  const [row] = await db.update(sagaTasks).set(updateData).where(eq(sagaTasks.task_id, taskId)).returning();
  return row ?? null;
}

export async function updateInstanceStatus(sagaId: string, status: SagaStatus, currentStepCode: string): Promise<void> {
  await db
    .update(sagaInstances)
    .set({ status, current_step_code: currentStepCode })
    .where(eq(sagaInstances.saga_id, sagaId));
}

/** Hitung jumlah task per status dalam 1 saga instance — dipakai buat nentuin kapan saga bisa dianggap COMPLETED. */
export async function countTasksByStatus(sagaId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: sagaTasks.status, total: count() })
    .from(sagaTasks)
    .where(eq(sagaTasks.saga_id, sagaId))
    .groupBy(sagaTasks.status);

  return Object.fromEntries(rows.map((row) => [row.status, row.total]));
}
