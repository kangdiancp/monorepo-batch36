import { sql } from 'drizzle-orm';
import { db_payroll } from '../../../../db';


// hr-employee-replica.repository.ts
// Menulis ke replika hr.employees & hr.departments di payroll_db
// Menggunakan Drizzle ORM transaction & sql 


export interface EmployeeReplicaInput {
  employeeId: number;
  firstName: string | null;
  lastName: string;
  email: string;
  departmentId: number | null;
  salary: string; // string "8500000.00" -> kolom NUMERIC, tidak lewat float
  employmentStatus: string;
  employmentType: string;
  updatedAt: string;
}

const UNSYNCED_DEPARTMENT_NAME = 'UNSYNCED';

export async function upsertEmployee(emp: EmployeeReplicaInput): Promise<boolean> {
  return db_payroll.transaction(async (tx) => {
    if (emp.departmentId !== null) {
      await tx.execute(sql`
        INSERT INTO hr.departments (department_id, department_name)
        VALUES (${emp.departmentId}, ${UNSYNCED_DEPARTMENT_NAME})
        ON CONFLICT (department_id) DO NOTHING
      `);
    }

    const result = await tx.execute(sql`
      INSERT INTO hr.employees
          (employee_id, first_name, last_name, email, department_id, salary,
           employment_status, employment_type, created_at, updated_at)
       VALUES (${emp.employeeId}, ${emp.firstName}, ${emp.lastName}, ${emp.email}, ${emp.departmentId}, ${emp.salary}, ${emp.employmentStatus}, ${emp.employmentType}, CURRENT_TIMESTAMP, ${emp.updatedAt})
       ON CONFLICT (employee_id) DO UPDATE SET
          first_name        = EXCLUDED.first_name,
          last_name         = EXCLUDED.last_name,
          email             = EXCLUDED.email,
          department_id     = EXCLUDED.department_id,
          salary            = EXCLUDED.salary,
          employment_status = EXCLUDED.employment_status,
          employment_type   = EXCLUDED.employment_type,
          updated_at        = EXCLUDED.updated_at
       WHERE hr.employees.updated_at IS NULL
          OR hr.employees.updated_at < EXCLUDED.updated_at
    `);

    return (result.rowCount ?? 0) > 0;
  });
}

export async function markEmployeeTerminated(employeeId: number): Promise<boolean> {
  const result = await db_payroll.execute(sql`
    UPDATE hr.employees
    SET employment_status = 'TERMINATED', updated_at = CURRENT_TIMESTAMP
    WHERE employee_id = ${employeeId}
  `);
  return (result.rowCount ?? 0) > 0;
}

export async function employeeExists(employeeId: number): Promise<boolean> {
  const result = await db_payroll.execute(sql`
    SELECT 1 FROM hr.employees WHERE employee_id = ${employeeId}
  `);
  return result.rows.length > 0;
}