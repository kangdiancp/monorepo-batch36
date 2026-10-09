import type { db } from '../../db';
import { employeeEventsOutbox } from '../../db/schema';
import type { EmployeeEventType, HrEmployeeEvent } from '../../common/kafka/kafka-config';
import type { EmployeeRow } from './employees.types';

/** Tipe transaksi Drizzle — supaya enqueue bisa dipanggil di dalam db.transaction(). */
export type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Snapshot employee untuk payload event. `salary` sengaja diambil dari row
 * MENTAH (string "8500000.00"), bukan hasil toApiRow() yang sudah jadi number,
 * supaya tidak ada floating point error di sisi payroll.
 */
function buildEventData(row: EmployeeRow): NonNullable<HrEmployeeEvent['data']> {
  return {
    first_name: row.firstName,
    last_name: row.lastName,
    email: row.email,
    department_id: row.departmentId,
    salary: row.salary,
    employment_status: row.employmentStatus,
    employment_type: row.employmentType,
    updated_at: row.updatedAt,
  };
}

/** Tulis event ke hr.employee_events_outbox — WAJIB dipanggil dengan `tx` dari transaksi yang sama dengan perubahan employee. */
export async function enqueueEmployeeEvent(
  tx: DbTx,
  eventType: EmployeeEventType,
  row: EmployeeRow,
): Promise<void> {
 
  await tx.insert(employeeEventsOutbox).values({
    aggregateId: row.employeeId,
    eventType,
    // terminated tidak membawa data — consumer cukup tahu "employee X resign/terminated"
    payload: eventType === 'employee.terminated' ? "{}" : buildEventData(row),
  });
}