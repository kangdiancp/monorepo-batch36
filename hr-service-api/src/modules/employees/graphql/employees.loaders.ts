import DataLoader from 'dataloader'
import { inArray } from 'drizzle-orm'
import { db } from '../../../db'
import { jobs, departments, employees } from '../../../db/schema'


type EmployeeRow = typeof employees.$inferSelect
type EmployeeApiRow = Omit<EmployeeRow, 'salary'> & { salary: number }

function toApiRow(row: EmployeeRow): EmployeeApiRow {
  return { ...row, salary: Number(row.salary) }
}

export interface EmployeeLoaders {
  jobLoader: DataLoader<number, typeof jobs.$inferSelect | null>
  departmentLoader: DataLoader<number, typeof departments.$inferSelect | null>
  employeeLoader: DataLoader<number, EmployeeApiRow | null>
  directReportsLoader: DataLoader<number, EmployeeApiRow[]>
}

export function createEmployeeLoaders(): EmployeeLoaders {
  const jobLoader = new DataLoader<number, typeof jobs.$inferSelect | null>(async (ids) => {
    const rows = await db.select().from(jobs).where(inArray(jobs.jobId, [...ids]))
    const byId = new Map(rows.map((r) => [r.jobId, r]))
    return ids.map((id) => byId.get(id) ?? null)
  })

  const departmentLoader = new DataLoader<number, typeof departments.$inferSelect | null>(async (ids) => {
    const rows = await db.select().from(departments).where(inArray(departments.departmentId, [...ids]))
    const byId = new Map(rows.map((r) => [r.departmentId, r]))
    return ids.map((id) => byId.get(id) ?? null)
  })


  const employeeLoader = new DataLoader<number, EmployeeApiRow | null>(async (ids) => {
    const rows = await db.select().from(employees).where(inArray(employees.employeeId, [...ids]))
    const byId = new Map(rows.map((r) => [r.employeeId, toApiRow(r)]))
    return ids.map((id) => byId.get(id) ?? null)
  })


  const directReportsLoader = new DataLoader<number, EmployeeApiRow[]>(async (managerIds) => {
    const rows = await db.select().from(employees).where(inArray(employees.managerId, [...managerIds]))
    return managerIds.map((mid) => rows.filter((r) => r.managerId === mid).map(toApiRow))
  })

  return { jobLoader, departmentLoader, employeeLoader, directReportsLoader }
}