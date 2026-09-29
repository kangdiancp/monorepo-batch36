import { env } from '../config/env';
import { Pool } from 'pg';
import { type CreateDepartmentRequest } from '../grpc/generated/employee';


export const pool = new Pool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    max: env.DB_POOL_MAX,
    ssl: env.DB_SSL ? { rejectUnauthorized: false } : undefined,
    options: `-c search_path=${env.DB_SCHEMAS},public`,
});

export async function upsertDepartment(dept: CreateDepartmentRequest): Promise<void> {
    await pool.query(
        `INSERT INTO hr.departments (department_id,department_name)
         VALUES ($1,$2)
         ON CONFLICT (department_id)
         DO UPDATE SET department_name = EXCLUDED.department_name`,
        [dept.deparmentId,dept.departmentName],
    );
}


export interface UpsertEmployeeInput {
    employeeId: number;
    firstName: string | null;
    lastName: string;
    email: string;
    departmentId: number | null;
    salary: string; 
    employmentStatus: string;
    employmentType: string;
    updatedAt: string;
}

export async function upsertEmployee(employee: UpsertEmployeeInput): Promise<void> {
    await pool.query(
        `INSERT INTO hr.employees
            (employee_id, first_name, last_name, email, department_id, salary,
             employment_status, employment_type, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9)
         ON CONFLICT (employee_id) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            email = EXCLUDED.email,
            department_id = EXCLUDED.department_id,
            salary = EXCLUDED.salary,
            employment_status = EXCLUDED.employment_status,
            employment_type = EXCLUDED.employment_type,
            updated_at = EXCLUDED.updated_at
         WHERE hr.employees.updated_at IS NULL
            OR hr.employees.updated_at < EXCLUDED.updated_at`,
        [
            employee.employeeId,
            employee.firstName,
            employee.lastName,
            employee.email,
            employee.departmentId,
            employee.salary,
            employee.employmentStatus,
            employee.employmentType,
            employee.updatedAt,
        ],
    );
}

export async function employeeExists(employeeId: number): Promise<boolean> {
    const { rows } = await pool.query('SELECT 1 FROM hr.employees WHERE employee_id = $1', [employeeId]);
    return rows.length > 0;
}


export async function markEmployeeTerminated(employeeId: number): Promise<void> {
    await pool.query(
        `UPDATE hr.employees SET employment_status = 'TERMINATED', updated_at = CURRENT_TIMESTAMP
         WHERE employee_id = $1`,
        [employeeId],
    );
}