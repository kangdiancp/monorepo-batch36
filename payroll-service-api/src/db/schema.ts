import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';


export const hrSchema = pgSchema('hr');
export const finSchema = pgSchema('fin');
export const sagaSchema = pgSchema('saga');

// ---------------------------------------------------------------------------
// hr.departments — replika minimal (bukan sumber kebenaran, lihat DDL)
// ---------------------------------------------------------------------------
export const departments = hrSchema.table('departments', {
  department_id: integer('department_id').primaryKey(), // BUKAN serial — sama persis id dari hr-service
  department_name: varchar('department_name', { length: 30 }).notNull(),
});

export const departmentsRelations = relations(departments, ({ many }) => ({
  employees: many(employees),
  payrollRuns: many(payrollRuns),
}));

// ---------------------------------------------------------------------------
// hr.employees — replika minimal
// ---------------------------------------------------------------------------
export const EMPLOYMENT_STATUSES = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED'] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const EMPLOYMENT_TYPES = ['PERMANENT', 'CONTRACT', 'INTERN', 'PROBATION'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const employees = hrSchema.table(
  'employees',
  {
    employee_id: integer('employee_id').primaryKey(), // BUKAN serial — sama persis id dari hr-service
    first_name: varchar('first_name', { length: 20 }),
    last_name: varchar('last_name', { length: 25 }).notNull(),
    email: varchar('email', { length: 100 }).notNull(),
    department_id: integer('department_id').references(() => departments.department_id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    salary: numeric('salary', { precision: 8, scale: 2 }).notNull(),
    employment_status: varchar('employment_status', { length: 20 })
      .notNull()
      .default('ACTIVE')
      .$type<EmploymentStatus>(),
    employment_type: varchar('employment_type', { length: 20 })
      .notNull()
      .default('PERMANENT')
      .$type<EmploymentType>(),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    check(
      'ck_employees_status',
      sql`${table.employment_status} IN ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED')`,
    ),
    check('ck_employees_type', sql`${table.employment_type} IN ('PERMANENT', 'CONTRACT', 'INTERN', 'PROBATION')`),
    index('idx_employees_department').on(table.department_id),
  ],
);

export const employeesRelations = relations(employees, ({ one, many }) => ({
  department: one(departments, { fields: [employees.department_id], references: [departments.department_id] }),
  generatedPayrollRuns: many(payrollRuns, { relationName: 'generated_by' }),
  approvedPayrollRuns: many(payrollRuns, { relationName: 'approved_by' }),
}));

// ---------------------------------------------------------------------------
// saga.saga_instances — dipakai sebagai FK target payroll_runs.saga_id
// ---------------------------------------------------------------------------
export const SAGA_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'] as const;
export type SagaStatus = (typeof SAGA_STATUSES)[number];

export const sagaInstances = sagaSchema.table(
  'saga_instances',
  {
    saga_id: uuid('saga_id').primaryKey().default(sql`gen_random_uuid()`),
    domain_context: varchar('domain_context', { length: 50 }).notNull(),
    reference_id: varchar('reference_id', { length: 100 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('IN_PROGRESS').$type<SagaStatus>(),
    current_step_code: varchar('current_step_code', { length: 50 }),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_saga_domain_ref').on(table.domain_context, table.reference_id),
    check('ck_saga_status', sql`${table.status} IN ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED')`),
  ],
);

export const sagaInstancesRelations = relations(sagaInstances, ({ many }) => ({
  payrollRuns: many(payrollRuns),
  tasks: many(sagaTasks),
}));

// ---------------------------------------------------------------------------
// saga.task_definitions — katalog/template task, reusable lintas saga instance
// (mis. 12 task baku alur payroll, domain_context='PAYROLL')
// ---------------------------------------------------------------------------
export const TASK_TYPES = ['AUTO', 'MANUAL', 'NOTIF', 'INTEGRATION'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const taskDefinitions = sagaSchema.table(
  'task_definitions',
  {
    task_def_id: uuid('task_def_id').primaryKey().default(sql`gen_random_uuid()`),
    domain_context: varchar('domain_context', { length: 50 }).notNull(),
    task_code: varchar('task_code', { length: 50 }).notNull(),
    task_name: varchar('task_name', { length: 100 }).notNull(),
    sequence_order: integer('sequence_order').notNull(),
    task_type: varchar('task_type', { length: 20 }).notNull().$type<TaskType>(),
    assigned_role: varchar('assigned_role', { length: 50 }),
    trigger_event: varchar('trigger_event', { length: 100 }),
    completion_event: varchar('completion_event', { length: 100 }),
    timeout_hours: integer('timeout_hours').default(24),
    is_required: boolean('is_required').default(true),
    can_skip: boolean('can_skip').default(false),
    retry_count: integer('retry_count').default(3),
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_task_domain_code').on(table.domain_context, table.task_code),
    check('ck_task_def_type', sql`${table.task_type} IN ('AUTO', 'MANUAL', 'NOTIF', 'INTEGRATION')`),
  ],
);

// ---------------------------------------------------------------------------
// saga.saga_tasks — task per-instance. `task_name` dicocokkan MANUAL ke
// `task_definitions.task_name` (domain_context yang sama) buat dapat
// `sequence_order`/`task_type` — TIDAK ADA FK eksplisit antara saga_tasks
// dan task_definitions, ini mengikuti desain asli DDL apa adanya (bukan
// keputusan Drizzle), jadi kalau task_name-nya typo/berubah, hubungannya putus.
// ---------------------------------------------------------------------------
export const SAGA_TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED'] as const;
export type SagaTaskStatus = (typeof SAGA_TASK_STATUSES)[number];

export const sagaTasks = sagaSchema.table(
  'saga_tasks',
  {
    task_id: uuid('task_id').primaryKey().default(sql`gen_random_uuid()`),
    saga_id: uuid('saga_id')
      .notNull()
      .references(() => sagaInstances.saga_id, { onDelete: 'cascade' }),
    task_name: varchar('task_name', { length: 100 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('PENDING').$type<SagaTaskStatus>(),
    assigned_to_emp_id: integer('assigned_to_emp_id').references(() => employees.employee_id, {
      onDelete: 'set null',
    }),
    started_at: timestamp('started_at'),
    completed_at: timestamp('completed_at'),
    due_date: timestamp('due_date'),
    input_payload: jsonb('input_payload'),
    output_payload: jsonb('output_payload'),
    error_message: text('error_message'),
    retry_count: integer('retry_count').notNull().default(0),
    last_attempt_at: timestamp('last_attempt_at'),
    created_at: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_saga_task_name').on(table.saga_id, table.task_name),
    index('idx_saga_tasks_saga').on(table.saga_id),
    index('idx_saga_tasks_assignee').on(table.assigned_to_emp_id),
    check('ck_st_status', sql`${table.status} IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED')`),
  ],
);

export const sagaTasksRelations = relations(sagaTasks, ({ one }) => ({
  sagaInstance: one(sagaInstances, { fields: [sagaTasks.saga_id], references: [sagaInstances.saga_id] }),
  assignee: one(employees, { fields: [sagaTasks.assigned_to_emp_id], references: [employees.employee_id] }),
}));

// ---------------------------------------------------------------------------
// fin.payroll_runs — aggregate root module `payroll-run`
// ---------------------------------------------------------------------------
export const RUN_TYPES = ['REGULAR', 'THR', 'BONUS', 'CORRECTION'] as const;
export type RunType = (typeof RUN_TYPES)[number];

export const RUN_STATUSES = [
  'DRAFT',
  'PROCESSING',
  'REVIEW',
  'APPROVED',
  'PAID',
  'PAID_WITH_EXCEPTION',
  'CANCELLED',
] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const payrollRuns = finSchema.table(
  'payroll_runs',
  {
    run_id: uuid('run_id').primaryKey().default(sql`gen_random_uuid()`),
    run_code: varchar('run_code', { length: 30 }).notNull(),
    period_month: smallint('period_month').notNull(),
    period_year: integer('period_year').notNull(),
    description: varchar('description', { length: 255 }),
    department_id: integer('department_id').references(() => departments.department_id, { onDelete: 'set null' }),
    run_type: varchar('run_type', { length: 20 }).notNull().default('REGULAR').$type<RunType>(),
    status: varchar('status', { length: 20 }).notNull().default('DRAFT').$type<RunStatus>(),
    total_employees: integer('total_employees').default(0),
    total_gross: numeric('total_gross', { precision: 18, scale: 2 }).default('0'),
    total_deduction: numeric('total_deduction', { precision: 18, scale: 2 }).default('0'),
    total_net: numeric('total_net', { precision: 18, scale: 2 }).default('0'),
    total_paid: integer('total_paid').default(0),
    saga_id: uuid('saga_id').references(() => sagaInstances.saga_id, { onDelete: 'set null' }),
    started_at: timestamp('started_at'),
    completed_at: timestamp('completed_at'),
    approved_at: timestamp('approved_at'),
    paid_at: timestamp('paid_at'),
    generated_by: integer('generated_by')
      .notNull()
      .references(() => employees.employee_id),
    approved_by: integer('approved_by').references(() => employees.employee_id),
    cancelled_by: integer('cancelled_by'), // sengaja tanpa FK — mengikuti DDL asli
    cancel_reason: varchar('cancel_reason'),
    notes: varchar('notes'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_payroll_run_code').on(table.run_code),
    // ⚠️ CATATAN PENTING: constraint ini TIDAK mencegah 2 payroll run company-wide
    // (department_id = NULL) di period+type yang sama — Postgres menganggap
    // `NULL != NULL` di constraint UNIQUE (perilaku standar SQL, bukan bug Drizzle).
    // DDL sumber (`database/02-ddl-fin-saga.sql`) comment-nya bilang "satu record
    // per bulan per tipe per department", tapi constraint plain UNIQUE ini cuma
    // benar-benar menegakkan itu untuk department_id yang TERISI (non-null).
    // Kalau butuh company-wide run juga unik, opsi perbaikannya: ganti jadi
    // `UNIQUE NULLS NOT DISTINCT (...)` (Postgres 15+), atau enforce di service
    // layer (cek manual sebelum insert kalau department_id null).
    uniqueIndex('uq_payroll_run_period').on(
      table.period_month,
      table.period_year,
      table.run_type,
      table.department_id,
    ),
    index('idx_payroll_runs_period').on(table.period_year, table.period_month),
    index('idx_payroll_runs_status').on(table.status),
    index('idx_payroll_runs_saga').on(table.saga_id),
    index('idx_payroll_runs_dept').on(table.department_id),
    check(
      'ck_pr_status',
      sql`${table.status} IN ('DRAFT', 'PROCESSING', 'REVIEW', 'APPROVED', 'PAID', 'PAID_WITH_EXCEPTION', 'CANCELLED')`,
    ),
    check('ck_pr_type', sql`${table.run_type} IN ('REGULAR', 'THR', 'BONUS', 'CORRECTION')`),
    check('ck_pr_month', sql`${table.period_month} BETWEEN 1 AND 12`),
  ],
);

export const payrollRunsRelations = relations(payrollRuns, ({ one }) => ({
  department: one(departments, { fields: [payrollRuns.department_id], references: [departments.department_id] }),
  sagaInstance: one(sagaInstances, { fields: [payrollRuns.saga_id], references: [sagaInstances.saga_id] }),
  generatedByEmployee: one(employees, {
    fields: [payrollRuns.generated_by],
    references: [employees.employee_id],
    relationName: 'generated_by',
  }),
  approvedByEmployee: one(employees, {
    fields: [payrollRuns.approved_by],
    references: [employees.employee_id],
    relationName: 'approved_by',
  }),
}));
