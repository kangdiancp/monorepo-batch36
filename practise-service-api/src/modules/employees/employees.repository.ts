import { and, count, eq, ilike, or, type SQL } from 'drizzle-orm';
import { trace } from '@opentelemetry/api';
import { db } from '../../db';
import { employees, employeeEventsOutbox } from '../../db/schema';
import { employeeQueryDuration, employeeListRequestsCounter, classifyFilterType } from '../../common/observability/metric';
import type { CreateEmployeeInput, ListEmployeeQuery, UpdateEmployeeInput } from './employees.schema';
import type { EmployeeApiRow, EmployeeRow } from './employees.types';

const tracer = trace.getTracer('employees.repository');

function toApiRow(row: EmployeeRow): EmployeeApiRow {
  return { ...row, salary: Number(row.salary) };
}

/**
 * Payload yang dikirim ke Kafka lewat outbox — versi ringkas, samakan dengan
 * EmployeeResponse di hr_service.proto supaya konsumen (payroll-service) bisa
 * langsung upsert tanpa fallback gRPC.
 */
function toOutboxPayload(row: EmployeeRow) {
  return {
    employee_id: row.employeeId,
    first_name: row.firstName,
    last_name: row.lastName,
    email: row.email,
    department_id: row.departmentId,
    salary: row.salary, // tetap string (numeric), JANGAN Number() di sini
    employment_status: row.employmentStatus,
    employment_type: row.employmentType,
    updated_at: row.updatedAt,
  };
}

export async function findAll(
  filter: ListEmployeeQuery,
): Promise<{ rows: EmployeeApiRow[]; total: number }> {
  return tracer.startActiveSpan('employees.repository.findAll', async (span) => {
    const startTime = performance.now();
    const filterType = classifyFilterType(filter);

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
        db.select().from(employees).where(whereClause).limit(limit).offset(offset),
        db.select({ total: count() }).from(employees).where(whereClause),
      ]);

      const total = totalRow[0]?.total ?? 0;
      span.setAttribute('employees.result.count', rows.length);
      span.setAttribute('employees.result.total', total);

      // Metrics dicatat SETELAH sukses — kalau mau catat yang gagal juga, tambah di catch.
      employeeListRequestsCounter.add(1, { filter_type: filterType });
      employeeQueryDuration.record(performance.now() - startTime, { filter_type: filterType });

      return { rows: rows.map(toApiRow), total };
    } catch (err) {
      employeeListRequestsCounter.add(1, { filter_type: filterType, status: 'error' });
      throw err;
    } finally {
      span.end();
    }
  });
}

export async function findById(id: number): Promise<EmployeeApiRow | null> {
  const [row] = await db.select().from(employees).where(eq(employees.employeeId, id));
  return row ? toApiRow(row) : null;
}

/**
 * create() — insert employee + insert outbox event DALAM SATU TRANSAKSI.
 * Kalau salah satu gagal, DUA-DUANYA di-rollback (transactional outbox pattern) —
 * tidak ada state "employee tersimpan tapi event hilang" atau sebaliknya.
 */
export async function create(input: CreateEmployeeInput): Promise<EmployeeApiRow> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(employees)
      .values({
        firstName: input.first_name ?? null,
        lastName: input.last_name,
        email: input.email,
        phoneNumber: input.phone_number ?? null,
        hireDate: input.hire_date,
        jobId: input.job_id,
        salary: input.salary.toFixed(2), // number -> string, sesuai precision(8,2)
        managerId: input.manager_id ?? null,
        departmentId: input.department_id ?? null,
        ...(input.employment_status !== undefined && { employmentStatus: input.employment_status }),
        ...(input.employment_type !== undefined && { employmentType: input.employment_type }),
        terminationDate: input.termination_date ?? null,
      })
      .returning();

    await tx.insert(employeeEventsOutbox).values({
      aggregateId: row!.employeeId,
      eventType: 'employee.created',
      payload: toOutboxPayload(row!),
    });

    return toApiRow(row!);
  });
}

export async function update(id: number, input: UpdateEmployeeInput): Promise<EmployeeApiRow | null> {
  return db.transaction(async (tx) => {
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

    if (!row) return null; // employee tidak ditemukan -> tidak ada apa pun yang di-commit (rollback otomatis)

    await tx.insert(employeeEventsOutbox).values({
      aggregateId: row.employeeId,
      eventType: 'employee.updated',
      payload: toOutboxPayload(row),
    });

    return toApiRow(row);
  });
}

/**
 * remove() — employee dihapus PERMANEN dari hr_db (cascade ke dependents,
 * employee_bank_accounts, employee_files). Replika di payroll-service TIDAK
 * di-hard-delete (masih dipakai historical FK di fin.payroll_history dst) —
 * makanya event yang dikirim 'employee.terminated', payload cukup employee_id.
 */
export async function remove(id: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    const result = await tx
      .delete(employees)
      .where(eq(employees.employeeId, id))
      .returning({ employeeId: employees.employeeId });

    if (result.length === 0) return false;

    await tx.insert(employeeEventsOutbox).values({
      aggregateId: id,
      eventType: 'employee.terminated',
      payload: { employee_id: id },
    });

    return true;
  });
}