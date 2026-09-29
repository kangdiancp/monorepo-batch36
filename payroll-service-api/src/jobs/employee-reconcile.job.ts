import cron from 'node-cron';
import * as hrClient from '../grpc/hr-service.client';
import { upsertDepartment, upsertEmployee } from '../repositories/hr-employee-replica.repository';
import type { EmployeeResponse } from '../grpc/generated/employee';


function toHrEmployeeDtoFromPayrollStream(employee: EmployeeResponse) {
    return {
        employeeId: employee.employeeId,
        firstName: employee.firstName || null,
        lastName: employee.lastName,
        email: employee.email,
        departmentId: employee.departmentId || null,
        salary: Number(employee.salary).toFixed(2),
        employmentStatus: employee.employmentStatus,
        employmentType: employee.employmentType,
        updatedAt: employee.updatedAt,
    };
}


async function reconcileAllDepartments(): Promise<void> {
    const startedAt = Date.now();
    console.log('[employee-reconcile] mulai full reconcile...');

    const departments = await hrClient.listDepartments(); //gRPC streams
    for (const dept of departments) {
        await upsertDepartment({
            deparmentId: dept.departmentId,
            departmentName: dept.departmentName,
        });
    }

    let count = 0;
    await hrClient.streamEmployeesForPayroll(undefined, async (employee) => {
        await upsertEmployee(toHrEmployeeDtoFromPayrollStream(employee));
        count += 1;
    });

    console.log(
        `[employee-reconcile] selesai — ${departments.length} department, ${count} employee, ${Date.now() - startedAt
        }ms`,
    );
}

export async function runInitialSync(): Promise<void> {
    await reconcileAllDepartments();
}


export function scheduleEmployeeReconcile(): void {
    // Tiap hari jam 02:00
    cron.schedule('0 2 * * *', () => {
        reconcileAllDepartments().catch((err) => {
            console.error('[employee-reconcile] gagal reconcile:', err);
        });
    });

    console.log('[employee-reconcile] scheduled: tiap hari 02:00');
}

if (require.main === module) {
    runInitialSync()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}