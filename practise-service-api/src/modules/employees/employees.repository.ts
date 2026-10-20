import { and, count, eq, ilike, ne, or, type SQL } from 'drizzle-orm';
import { trace } from '@opentelemetry/api';
import { db_hr } from '../../db';
import { employees } from '../../db/schema';
import type { CreateEmployeeInput, ListEmployeeQuery, UpdateEmployeeInput } from './employees.schema';
import type { EmployeeApiRow, EmployeeRow } from './employees.types';
import { enqueueEmployeeEvent } from './employee-events';

const tracer = trace.getTracer('employees.repository');

function toApiRow(row: EmployeeRow): EmployeeApiRow {
  return { ...row, salary: Number(row.salary) };
}

export async function findAll(
  filter: ListEmployeeQuery,
): Promise<{ rows: EmployeeApiRow[]; total: number }> {
  return tracer.startActiveSpan('employees.repository.findAll', async (span) => {
    try {
      const { page, limit, search, departmentId, jobId, managerId, employmentStatus, employmentType } = filter;
      const offset = (page - 1) * limit;

      span.setAttributes({
        'employees.filter.has_search': Boolean(search),
        'employees.filter.department_id': departmentId ?? -1,
        'employees.filter.job_id': jobId ?? -1,
        'employees.pagination.page': page,
        'employees.pagination.limit': limit,
      });

      const conditions: SQL[] = [];
      if (search) {
        conditions.push(
          or(
            ilike(employees.firstName, `%${search}%`),
            ilike(employees.lastName, `%${search}%`),
            ilike(employees.email, `%${search}%`),
          )!,
        );
      }
      if (departmentId) conditions.push(eq(employees.departmentId, departmentId));
      if (jobId) conditions.push(eq(employees.jobId, jobId));
      if (managerId) conditions.push(eq(employees.managerId, managerId));
      if (employmentStatus) conditions.push(eq(employees.employmentStatus, employmentStatus));
      if (employmentType) conditions.push(eq(employees.employmentType, employmentType));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, totalRow] = await Promise.all([
        db_hr.select().from(employees).where(whereClause).limit(limit).offset(offset),
        db_hr.select({ total: count() }).from(employees).where(whereClause),
      ]);

      const total = totalRow[0]?.total ?? 0;
      span.setAttribute('employees.result.count', rows.length);
      span.setAttribute('employees.result.total', total);

      return { rows: rows.map(toApiRow), total };
    } finally {
      span.end();
    }
  });
}

export async function findById(id: number): Promise<EmployeeApiRow | null> {
  const [row] = await db_hr.select().from(employees).where(eq(employees.employeeId, id));
  return row ? toApiRow(row) : null;
}

/** INSERT employee + event `employee.created` dalam SATU transaksi. */
export async function create(input: CreateEmployeeInput): Promise<EmployeeApiRow> {
  return db_hr.transaction(async (tx) => {
    const [row] = await tx
      .insert(employees)
      .values({
        firstName: input.first_name ?? null,
        lastName: input.last_name,
        email: input.email,
        phoneNumber: input.phone_number ?? null,
        hireDate: input.hire_date,
        jobId: input.job_id,
        salary: input.salary.toFixed(2), 
        managerId: input.manager_id ?? null,
        departmentId: input.department_id ?? null,
        ...(input.employment_status !== undefined && { employmentStatus: input.employment_status }),
        ...(input.employment_type !== undefined && { employmentType: input.employment_type }),
        terminationDate: input.termination_date ?? null,
      })
      .returning();

    await enqueueEmployeeEvent(tx, 'employee.created', row!);
    return toApiRow(row!);
  });
}

export async function update(id: number, input: UpdateEmployeeInput): Promise<EmployeeApiRow | null> {
  return db_hr.transaction(async (tx) => {
    const [row] = await tx
      .update(employees)
      .set({
        ...(input.first_name !== undefined && { firstName: input.first_name }),
        ...(input.last_name !== undefined && { lastName: input.last_name }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.phone_number !== undefined && { phoneNumber: input.phone_number }),
        ...(input.hire_date !== undefined && { hireDate: input.hire_date }),
        ...(input.job_id !== undefined && { jobId: input.job_id }),
        ...(input.salary !== undefined && { salary: input.salary.toFixed(2) }),
        ...(input.manager_id !== undefined && { managerId: input.manager_id }),
        ...(input.department_id !== undefined && { departmentId: input.department_id }),
        ...(input.employment_status !== undefined && { employmentStatus: input.employment_status }),
        ...(input.employment_type !== undefined && { employmentType: input.employment_type }),
        ...(input.termination_date !== undefined && { terminationDate: input.termination_date }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(employees.employeeId, id))
      .returning();

    if (!row) return null;

    await enqueueEmployeeEvent(tx, 'employee.updated', row);
    return toApiRow(row);
  });
}


export async function terminate(id: number, terminationDate: string): Promise<EmployeeApiRow | null> {
  return db_hr.transaction(async (tx) => {
    const [row] = await tx
      .update(employees)
      .set({
        employmentStatus: 'TERMINATED',
        terminationDate,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(employees.employeeId, id), ne(employees.employmentStatus, 'TERMINATED')))
      .returning();

    if (!row) return null;

    await enqueueEmployeeEvent(tx, 'employee.terminated', row);
    return toApiRow(row);
  });
}

export async function remove(id: number): Promise<boolean> {
  const result = await db_hr
    .delete(employees)
    .where(eq(employees.employeeId, id))
    .returning({ employeeId: employees.employeeId });
  return result.length > 0;
}