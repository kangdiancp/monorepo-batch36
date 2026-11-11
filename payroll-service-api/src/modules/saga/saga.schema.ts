import type { FromSchema } from 'json-schema-to-ts';

const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

export const SAGA_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'] as const;
export const SAGA_TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED'] as const;

export const sagaInstanceIdParamSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', pattern: UUID_PATTERN },
  },
  required: ['id'],
  additionalProperties: false,
} as const;

export const sagaTaskParamSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', pattern: UUID_PATTERN }, // saga_id
    taskId: { type: 'string', pattern: UUID_PATTERN },
  },
  required: ['id', 'taskId'],
  additionalProperties: false,
} as const;

export const createSagaInstanceBodySchema = {
  type: 'object',
  properties: {
    domain_context: { type: 'string', minLength: 1, maxLength: 50, default: 'PAYROLL' },
    reference_id: { type: 'string', minLength: 1, maxLength: 100, pattern: '\\S' },
  },
  required: ['reference_id'],
  additionalProperties: false,
} as const;

export const updateSagaTaskBodySchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: SAGA_TASK_STATUSES },
    error_message: { type: 'string' },
    assigned_to_emp_id: { type: 'integer', minimum: 1 },
  },
  required: ['status'],
  additionalProperties: false,
} as const;

export const listSagaInstanceQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    domain_context: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: SAGA_STATUSES },
  },
  additionalProperties: false,
} as const;

export type SagaInstanceIdParam = FromSchema<typeof sagaInstanceIdParamSchema>;
export type SagaTaskParam = FromSchema<typeof sagaTaskParamSchema>;
export type CreateSagaInstanceInput = FromSchema<typeof createSagaInstanceBodySchema>;
export type UpdateSagaTaskInput = FromSchema<typeof updateSagaTaskBodySchema>;

export type ListSagaInstanceQuery = FromSchema<typeof listSagaInstanceQuerySchema> &
  Required<Pick<FromSchema<typeof listSagaInstanceQuerySchema>, 'page' | 'limit'>>;
