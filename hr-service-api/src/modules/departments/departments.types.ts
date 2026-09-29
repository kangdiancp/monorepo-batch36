import type { departments } from '../../db/schema';

export type DepartmentRow = typeof departments.$inferSelect;
export type NewDepartmentRow = typeof departments.$inferInsert;

export interface DepartmentEmployeePreviewRow {
  employeeId: number;
  firstName: string | null;
  lastName: string;
  email: string;
  employmentStatus: string;
}

export interface DepartmentWithEmployeePreview {
  department: DepartmentRow;
  employees: DepartmentEmployeePreviewRow[];
  totalEmployees: number;
}