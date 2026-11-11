import { and, asc, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../../db';
import { departments, employees, payrollRuns } from '../../db/schema';
import type { CreatePayrollRunInput, ListPayrollRunQuery, UpdatePayrollRunInput } from './payroll-run.schema';
import type { PayrollRunRow, PayrollRunWithRelationsRow } from './payroll-run.types';


const generatedByEmployees = alias(employees, 'generated_by_employees');
const approvedByEmployees = alias(employees, 'approved_by_employees');

export async function findAll(filter: ListPayrollRunQuery): Promise<{ rows: PayrollRunRow[]; total: number }> {
 
  const { page, limit, search, status, run_type, period_year, period_month, department_id, sortBy, sortDir } = filter;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];
  if (search) {
    conditions.push(or(ilike(payrollRuns.run_code, `%${search}%`), ilike(payrollRuns.description, `%${search}%`))!);
  }
  if (status) conditions.push(eq(payrollRuns.status, status));
  if (run_type) conditions.push(eq(payrollRuns.run_type, run_type));
  if (period_year) conditions.push(eq(payrollRuns.period_year, period_year));
  if (period_month) conditions.push(eq(payrollRuns.period_month, period_month));
  if (department_id) conditions.push(eq(payrollRuns.department_id, department_id));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orderColumnMap = {
    created_at: payrollRuns.created_at,
    period_year: payrollRuns.period_year,
    period_month: payrollRuns.period_month,
    run_code: payrollRuns.run_code,
  } as const;
  const orderColumn = orderColumnMap[sortBy];
  const orderFn = sortDir === 'asc' ? asc : desc;

  const [rows, totalRow] = await Promise.all([
    db.select().from(payrollRuns).where(whereClause).orderBy(orderFn(orderColumn)).limit(limit).offset(offset),
    db.select({ total: count() }).from(payrollRuns).where(whereClause),
  ]);

  return { rows, total: totalRow[0]?.total ?? 0 };
}

export async function findById(id: string): Promise<PayrollRunRow | null> {
  const [row] = await db.select().from(payrollRuns).where(eq(payrollRuns.run_id, id));
  return row ?? null;
}


export async function findByIdWithRelations(id: string): Promise<PayrollRunWithRelationsRow | null> {
  const [row] = await db
    .select({
      run_id: payrollRuns.run_id,
      run_code: payrollRuns.run_code,
      period_month: payrollRuns.period_month,
      period_year: payrollRuns.period_year,
      description: payrollRuns.description,
      department_id: payrollRuns.department_id,
      run_type: payrollRuns.run_type,
      status: payrollRuns.status,
      total_employees: payrollRuns.total_employees,
      total_gross: payrollRuns.total_gross,
      total_deduction: payrollRuns.total_deduction,
      total_net: payrollRuns.total_net,
      total_paid: payrollRuns.total_paid,
      saga_id: payrollRuns.saga_id,
      started_at: payrollRuns.started_at,
      completed_at: payrollRuns.completed_at,
      approved_at: payrollRuns.approved_at,
      paid_at: payrollRuns.paid_at,
      generated_by: payrollRuns.generated_by,
      approved_by: payrollRuns.approved_by,
      cancelled_by: payrollRuns.cancelled_by,
      cancel_reason: payrollRuns.cancel_reason,
      notes: payrollRuns.notes,
      created_at: payrollRuns.created_at,
      updated_at: payrollRuns.updated_at,
      department_name: departments.department_name,
      generated_by_name: generatedByEmployees.first_name,
      approved_by_name: approvedByEmployees.first_name,
    })
    .from(payrollRuns)
    .leftJoin(departments, eq(payrollRuns.department_id, departments.department_id))
    .leftJoin(generatedByEmployees, eq(payrollRuns.generated_by, generatedByEmployees.employee_id))
    .leftJoin(approvedByEmployees, eq(payrollRuns.approved_by, approvedByEmployees.employee_id))
    .where(eq(payrollRuns.run_id, id));

  return row ?? null;
}

export async function create(input: CreatePayrollRunInput): Promise<PayrollRunRow> {
  const [row] = await db
    .insert(payrollRuns)
    .values({
      run_code: input.run_code,
      period_month: input.period_month,
      period_year: input.period_year,
      description: input.description ?? null,
      department_id: input.department_id ?? null,
      run_type: input.run_type ?? 'REGULAR',
      generated_by: input.generated_by,
      notes: input.notes ?? null,
    })
    .returning();
  return row!;
}


export async function updateDraftFields(
  id: string,
  input: UpdatePayrollRunInput,
): Promise<PayrollRunRow | null> {
  const updateData: Partial<typeof payrollRuns.$inferInsert> = {};

  if (input.run_code !== undefined) updateData.run_code = input.run_code;
  if (input.period_month !== undefined) updateData.period_month = input.period_month;
  if (input.period_year !== undefined) updateData.period_year = input.period_year;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.department_id !== undefined) updateData.department_id = input.department_id;
  if (input.run_type !== undefined) updateData.run_type = input.run_type;
  if (input.notes !== undefined) updateData.notes = input.notes;

  if (Object.keys(updateData).length === 0) {
    return findById(id);
  }

  const [row] = await db
    .update(payrollRuns)
    .set(updateData)
    .where(and(eq(payrollRuns.run_id, id), eq(payrollRuns.status, 'DRAFT')))
    .returning();
  return row ?? null;
}

/** REVIEW -> APPROVED */
export async function approve(id: string, approvedBy: number): Promise<PayrollRunRow | null> {
  const [row] = await db
    .update(payrollRuns)
    .set({ status: 'APPROVED', approved_by: approvedBy, approved_at: new Date() })
    .where(and(eq(payrollRuns.run_id, id), eq(payrollRuns.status, 'REVIEW')))
    .returning();
  return row ?? null;
}

/** status apa pun (selain PAID / PAID_WITH_EXCEPTION / CANCELLED) -> CANCELLED */
export async function cancel(id: string, cancelledBy: number, cancelReason: string): Promise<PayrollRunRow | null> {
  const [row] = await db
    .update(payrollRuns)
    .set({ status: 'CANCELLED', cancelled_by: cancelledBy, cancel_reason: cancelReason })
    .where(
      and(
        eq(payrollRuns.run_id, id),
        or(
          eq(payrollRuns.status, 'DRAFT'),
          eq(payrollRuns.status, 'PROCESSING'),
          eq(payrollRuns.status, 'REVIEW'),
          eq(payrollRuns.status, 'APPROVED'),
        ),
      ),
    )
    .returning();
  return row ?? null;
}

/** Hard delete — hanya untuk run yang masih DRAFT (dijaga juga di query ini). */
export async function remove(id: string): Promise<boolean> {
  const result = await db
    .delete(payrollRuns)
    .where(and(eq(payrollRuns.run_id, id), eq(payrollRuns.status, 'DRAFT')))
    .returning({ run_id: payrollRuns.run_id });
  return result.length > 0;
}
