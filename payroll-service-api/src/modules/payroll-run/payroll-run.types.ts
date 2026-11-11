import type { employees, payrollRuns } from '../../db/schema';

export type PayrollRunRow = typeof payrollRuns.$inferSelect;
export type EmployeeRow = typeof employees.$inferSelect;


export interface PayrollRunWithRelationsRow extends PayrollRunRow {
  department_name: string | null;
  generated_by_name: string | null;
  approved_by_name: string | null;
}
