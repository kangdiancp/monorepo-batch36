import { credentials, status as grpcStatus, type ServiceError } from '@grpc/grpc-js';
import {
    EmployeeServiceClient,
    type DepartmentResponse,
    type EmployeeResponse
} from './generated/employee';

const HR_SERVICE_GRPC_URL = process.env.HR_SERVICE_GRPC_URL ?? 'localhost:50051';


// Singleton — 1 channel gRPC dipakai ulang untuk semua request, jadi ga bikin
// new connection tiap kali dipanggil 
//
let client: EmployeeServiceClient | undefined;

function getClient(): EmployeeServiceClient {
    if (!client) {
        client = new EmployeeServiceClient(HR_SERVICE_GRPC_URL, credentials.createInsecure());
    }
    return client;
}

/** Tutup channel gRPC — dipanggil waktu graceful shutdown (`server.ts`). */
export function closeHrServiceClient(): void {
    client?.close();
    client = undefined;
}

export function getEmployee(employeeId: number): Promise<EmployeeResponse | null> {
    return new Promise((resolve, reject) => {
        getClient().getEmployee({ employeeId: employeeId }, (err: ServiceError | null, res) => {
            if (err) {
                if (err.code === grpcStatus.NOT_FOUND) return resolve(null);
                return reject(err);
            }
            resolve(res ?? null);
        });
    });
}


export function listEmployeesForPayroll(
    departmentId?: number,
    employmentStatus?: string,
): Promise<EmployeeResponse[]> {
    return new Promise((resolve, reject) => {
        const results: EmployeeResponse[] = [];
        const call = getClient().getEmployeesForPayroll({
            departmentId: departmentId ?? 0,
            employmentStatus: employmentStatus ?? '',
        });

        call.on('data', (res: EmployeeResponse) => results.push(res));
        call.on('end', () => resolve(results));
        call.on('error', (err) => reject(err));
    });
}

export function streamEmployeesForPayroll(
    departmentId: number | undefined,
    onEmployee: (employee: EmployeeResponse) => Promise<void> | void,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const call = getClient().getEmployeesForPayroll({
            departmentId: departmentId ?? 0,
            employmentStatus: '',
        });

        call.on('data', async (res: EmployeeResponse) => {
            call.pause();
            try {
                await onEmployee(res);
                call.resume();
            } catch (err) {
                call.destroy(err as Error);
            }
        });
        call.on('end', () => resolve());
        call.on('error', (err) => reject(err));
    });
}

export function listDepartments(): Promise<DepartmentResponse[]> {
    return new Promise((resolve, reject) => {
        const results: DepartmentResponse[] = [];
        const call = getClient().listDepartments({});

        call.on('data', (res: DepartmentResponse) => results.push(res)); //array
        call.on('end', () => resolve(results));
        call.on('error', (err) => reject(err));
    });
}

export function createDepartment(departmentName: string): Promise<DepartmentResponse> {
    return new Promise((resolve, reject) => {
        getClient().createDepartment({ departmentName: departmentName }, (err: ServiceError | null, res) => {
            if (err) return reject(err);
            resolve(res!);
        });
    });
}

export function updateDepartment(departmentId: number, departmentName: string): Promise<DepartmentResponse> {
    return new Promise((resolve, reject) => {
        getClient().updateDepartment(
            { departmentId: departmentId, departmentName: departmentName },
            (err: ServiceError | null, res) => {
                if (err) return reject(err);
                resolve(res!);
            },
        );
    });
}

export function deleteDepartment(departmentId: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
        getClient().deleteDepartment({ departmentId: departmentId }, (err: ServiceError | null, res) => {
            if (err) return reject(err);
            resolve(Boolean(res?.success));
        });
    });
}