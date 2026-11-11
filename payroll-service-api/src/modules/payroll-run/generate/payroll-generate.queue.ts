import { FlowProducer, Queue } from 'bullmq';

export const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
};

export const QUEUE_NAMES = {
  orchestrator: 'payroll-orchestrator', // plan-run, finalize-run
  batch: 'payroll-batch', // calc-* dan generate-payroll (per batch employee)
} as const;

export const JOB_PLAN_RUN = 'plan-run';
export const JOB_FINALIZE_RUN = 'finalize-run';

export interface RunJobData {
  runId: string;
  sagaId: string;
}

export interface BatchJobData extends RunJobData {
  taskId: string; // saga.saga_tasks.task_id
  batchNo: number;
  fromId: number; 
  toId: number;
  periodMonth: number;
  periodYear: number;
}

export const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 1000 },
};

let orchestratorQueue: Queue<RunJobData> | undefined;
let flowProducer: FlowProducer | undefined;

export function getOrchestratorQueue(): Queue<RunJobData> {
  orchestratorQueue ??= new Queue<RunJobData>(QUEUE_NAMES.orchestrator, { connection });
  return orchestratorQueue;
}

export function getFlowProducer(): FlowProducer {
  flowProducer ??= new FlowProducer({ connection });
  return flowProducer;
}

/** Dipanggil API saat user menekan "generate". Hanya memasukkan job plan-run. */
export async function enqueuePlanRun(data: RunJobData) {
  return getOrchestratorQueue().add(JOB_PLAN_RUN, data, DEFAULT_JOB_OPTS);
}

export async function closePayrollQueues(): Promise<void> {
  await Promise.all([orchestratorQueue?.close(), flowProducer?.close()]);
  orchestratorQueue = undefined;
  flowProducer = undefined;
}