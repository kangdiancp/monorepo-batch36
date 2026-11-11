import type { FromSchema } from 'json-schema-to-ts';

/**

 * State machine status (disederhanakan untuk starter ini):
 *   DRAFT --submit--> REVIEW --approve--> APPROVED
 *     |                  |                   |
 *     +---------- cancel (kapan saja selama belum PAID) ----------> CANCELLED
 */

export const RUN_TYPES = ['REGULAR', 'THR', 'BONUS', 'CORRECTION'] as const;
export const RUN_STATUSES = [
  'DRAFT',
  'PROCESSING',
  'REVIEW',
  'APPROVED',
  'PAID',
  'PAID_WITH_EXCEPTION',
  'CANCELLED',
] as const;


const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

export const payrollRunIdParamSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', pattern: UUID_PATTERN },
  },
  required: ['id'],
  additionalProperties: false,
} as const;

export const createPayrollRunBodySchema = {
  type: 'object',
  properties: {
    run_code: { type: 'string', minLength: 1, maxLength: 30, pattern: '\\S' },
    period_month: { type: 'integer', minimum: 1, maximum: 12 },
    period_year: { type: 'integer', minimum: 2000, maximum: 2100 },
    description: { type: 'string', maxLength: 255 },
    department_id: { type: ['integer', 'null'], minimum: 1 },
    run_type: { type: 'string', enum: RUN_TYPES, default: 'REGULAR' },
    generated_by: { type: 'integer', minimum: 1 },
    notes: { type: 'string' },
  },
  required: ['run_code', 'period_month', 'period_year', 'generated_by'],
  additionalProperties: false,
} as const;


export const updatePayrollRunBodySchema = {
  type: 'object',
  properties: {
    run_code: { type: 'string', minLength: 1, maxLength: 30, pattern: '\\S' },
    period_month: { type: 'integer', minimum: 1, maximum: 12 },
    period_year: { type: 'integer', minimum: 2000, maximum: 2100 },
    description: { type: ['string', 'null'], maxLength: 255 },
    department_id: { type: ['integer', 'null'], minimum: 1 },
    run_type: { type: 'string', enum: RUN_TYPES },
    notes: { type: ['string', 'null'] },
  },
  minProperties: 1,
  additionalProperties: false,
} as const;

export const approvePayrollRunBodySchema = {
  type: 'object',
  properties: {
    approved_by: { type: 'integer', minimum: 1 },
  },
  required: ['approved_by'],
  additionalProperties: false,
} as const;

export const cancelPayrollRunBodySchema = {
  type: 'object',
  properties: {
    cancelled_by: { type: 'integer', minimum: 1 },
    cancel_reason: { type: 'string', minLength: 1, pattern: '\\S' },
  },
  required: ['cancelled_by', 'cancel_reason'],
  additionalProperties: false,
} as const;

export const listPayrollRunQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    search: { type: 'string', minLength: 1 }, // cari di run_code / description
    status: { type: 'string', enum: RUN_STATUSES },
    run_type: { type: 'string', enum: RUN_TYPES },
    period_year: { type: 'integer', minimum: 2000, maximum: 2100 },
    period_month: { type: 'integer', minimum: 1, maximum: 12 },
    department_id: { type: 'integer', minimum: 1 },
    sortBy: { type: 'string', enum: ['created_at', 'period_year', 'period_month', 'run_code'], default: 'created_at' },
    sortDir: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
  additionalProperties: false,
} as const;

export type PayrollRunIdParam = FromSchema<typeof payrollRunIdParamSchema>;
export type CreatePayrollRunInput = FromSchema<typeof createPayrollRunBodySchema>;
export type UpdatePayrollRunInput = FromSchema<typeof updatePayrollRunBodySchema>;
export type ApprovePayrollRunInput = FromSchema<typeof approvePayrollRunBodySchema>;
export type CancelPayrollRunInput = FromSchema<typeof cancelPayrollRunBodySchema>;

export type ListPayrollRunQuery = FromSchema<typeof listPayrollRunQuerySchema> &
  Required<Pick<FromSchema<typeof listPayrollRunQuerySchema>, 'page' | 'limit' | 'sortBy' | 'sortDir'>>;
