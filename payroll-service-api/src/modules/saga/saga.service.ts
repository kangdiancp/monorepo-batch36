import { ApiError } from '../../common/utils/api-error';
import type { Pagination } from '../../common/utils/api-response';
import * as sagaRepository from './saga.repository';
import type { CreateSagaInstanceInput, ListSagaInstanceQuery, UpdateSagaTaskInput } from './saga.schema';
import type { SagaInstanceRow, SagaInstanceWithTasksRow, SagaTaskRow } from './saga.types';

export async function listSagaInstances(
  filter: ListSagaInstanceQuery,
): Promise<{ items: SagaInstanceRow[]; pagination: Pagination }> {
  const { rows, total } = await sagaRepository.findAll(filter);

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

export async function getSagaInstanceById(id: string): Promise<SagaInstanceWithTasksRow> {
  const instance = await sagaRepository.findByIdWithTasks(id);
  if (!instance) {
    throw ApiError.notFound(`Saga instance dengan id ${id} tidak ditemukan`);
  }
  return instance;
}

/**
 * Bikin saga instance baru — otomatis akan generate 12 `saga_tasks` (dengan status=
 * `PENDING`) dari katalog `task_definitions`. Kombinasi
 * `domain_context` + `reference_id` harus unik (dijaga di level database,
 * kalau bentrok error-handler otomatis balikin 409).
 */
export async function createSagaInstance(input: CreateSagaInstanceInput): Promise<SagaInstanceWithTasksRow> {
  const domainContext = input.domain_context ?? 'PAYROLL';
  return sagaRepository.createInstance(domainContext, input.reference_id);
}

/**
 * Perubahan saga task saat perubahan status :
 * - Saga status=`IN_PROGRESS` (task tidak bisa diupdate lagi
 *   kalau saga-nya sudah `COMPLETED`/`FAILED`/`CANCELLED`).
 * - Task `FAILED` -> saga instance ikut jadi `FAILED` (jika ada
 *   1 task yg failed, makas dianggap failed semua, jadi ga lanjut ke task berikutnya).
 * - Jika semua task `COMPLETED`/`SKIPPED` -> saga instance jadi `COMPLETED`.
 * - Selain itu, `current_step_code` di saga instance di-update ke nama task
 *   yang baru saja diproses (progress indicator sederhana).
 */
export async function updateTaskStatus(
  sagaId: string,
  taskId: string,
  input: UpdateSagaTaskInput,
): Promise<SagaTaskRow> {
  const instance = await sagaRepository.findById(sagaId);
  if (!instance) {
    throw ApiError.notFound(`Saga instance dengan id ${sagaId} tidak ditemukan`);
  }
  if (instance.status !== 'IN_PROGRESS') {
    throw ApiError.conflict(
      `Saga instance berstatus ${instance.status} — task di dalamnya tidak bisa diupdate lagi`,
    );
  }

  const task = await sagaRepository.findTaskById(sagaId, taskId);
  if (!task) {
    throw ApiError.notFound(`Task dengan id ${taskId} tidak ditemukan di saga instance ${sagaId}`);
  }

  const updated = await sagaRepository.updateTaskStatus(taskId, input.status, {
    errorMessage: input.error_message,
    assignedToEmpId: input.assigned_to_emp_id,
  });
  if (!updated) {
    throw ApiError.conflict('Task sudah berubah, update dibatalkan');
  }

  if (input.status === 'FAILED') {
    await sagaRepository.updateInstanceStatus(sagaId, 'FAILED', task.task_name);
  } else if (input.status === 'COMPLETED' || input.status === 'SKIPPED') {
    const counts = await sagaRepository.countTasksByStatus(sagaId);
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    const finished = (counts.COMPLETED ?? 0) + (counts.SKIPPED ?? 0);

    await sagaRepository.updateInstanceStatus(
      sagaId,
      finished === total ? 'COMPLETED' : 'IN_PROGRESS',
      task.task_name,
    );
  } else {
    await sagaRepository.updateInstanceStatus(sagaId, 'IN_PROGRESS', task.task_name);
  }

  return updated;
}
