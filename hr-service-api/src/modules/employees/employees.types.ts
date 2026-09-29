import type { employees } from '../../db/schema';

export type EmployeeRow = typeof employees.$inferSelect;
export type NewEmployeeRow = typeof employees.$inferInsert;

/**
 * Konvert salary string (postgres numeric default nya ubah ke string) 
 * jadi kita ubah ke number, kita cocokan dengan schema
 */
export type EmployeeApiRow = Omit<EmployeeRow, 'salary'> & { salary: number };