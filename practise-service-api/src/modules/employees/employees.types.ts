import type { employees } from '../../db/schema';

export type EmployeeRow = typeof employees.$inferSelect;
export type NewEmployeeRow = typeof employees.$inferInsert;

export type EmployeeApiRow = Omit<EmployeeRow, 'salary'> & { salary: number };