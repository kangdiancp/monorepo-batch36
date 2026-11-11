import type { sagaInstances, sagaTasks } from '../../db/schema';

export type SagaInstanceRow = typeof sagaInstances.$inferSelect;
export type SagaTaskRow = typeof sagaTasks.$inferSelect;

/** SagaTaskRow + sequence_order hasil join manual ke task_definitions (untuk urutan tampilan). */
export interface SagaTaskWithSequenceRow extends SagaTaskRow {
  sequence_order: number | null;
}

export interface SagaInstanceWithTasksRow extends SagaInstanceRow {
  tasks: SagaTaskWithSequenceRow[];
}
