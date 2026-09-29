import DataLoader from 'dataloader'
import { inArray } from 'drizzle-orm'
import { db } from '../../../db'
import { employees } from '../../../db/schema'

type EmployeeRow = typeof employees.$inferSelect
type EmployeeApiRow = Omit<EmployeeRow, 'salary'> & { salary: number }

function toApiRow(row: EmployeeRow): EmployeeApiRow {
  return { ...row, salary: Number(row.salary) }
}

export interface DepartmentLoaders {
  employeesByDepartmentLoader: DataLoader<number, EmployeeApiRow[]>
}

export function createDepartmentLoaders(): DepartmentLoaders {
  const employeesByDepartmentLoader = new DataLoader<number, EmployeeApiRow[]>(async (departmentIds) => {
    const rows = await db
      .select()
      .from(employees)
      .where(inArray(employees.departmentId, [...departmentIds] as number[]))

    return departmentIds.map((did) => rows.filter((r) => r.departmentId === did).map(toApiRow))
  })

  return { employeesByDepartmentLoader }
}