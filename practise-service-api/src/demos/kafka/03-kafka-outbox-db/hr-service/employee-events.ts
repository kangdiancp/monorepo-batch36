import type { db_hr } from '../../../../db';
import { employeeEventsOutbox } from '../../../../db/schema';
import type { EmployeeEventType, HrEmployeeEvent } from './kafka-config';
import type { EmployeeRow } from '../../../employees/employees.types';

export type DbTx = Parameters<Parameters<typeof db_hr.transaction>[0]>[0];


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

export async function enqueueEmployeeEvent(
  tx: DbTx,
  eventType: EmployeeEventType,
  row: EmployeeRow,
): Promise<void> {
  await tx.insert(employeeEventsOutbox).values({
    aggregateId: row.employeeId,
    eventType,
    payload: eventType === 'employee.terminated' ? null : buildEventData(row),
  });
}