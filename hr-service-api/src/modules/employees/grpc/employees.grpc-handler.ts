import type { sendUnaryData, ServerUnaryCall, ServerWritableStream } from '@grpc/grpc-js';
import { status } from '@grpc/grpc-js';
import * as employeeService from '../employees.service';
import { ApiError } from '../../../common/utils/api-error';
import type { EmployeeApiRow } from '../employees.types';
import type {
  GetEmployeeRequest,
  GetEmployeesForPayrollRequest,
  EmployeeResponse,
} from '../../../grpc/generated/employee'; // <-- baru, ganti manual types

function toGrpcResponse(row: EmployeeApiRow): EmployeeResponse {
  return {
    employeeId: row.employeeId,
    firstName: row.firstName ?? '',
    lastName: row.lastName,
    email: row.email,
    salary: row.salary,
    jobId: row.jobId,
    departmentId: row.departmentId ?? 0,
    employmentStatus: row.employmentStatus,
    employmentType: row.employmentType,
    hireDate: row.hireDate,
    updatedAt: row.updatedAt,
  };
}


// Mapping ApiError (HTTP-style) -> gRPC status code
function toGrpcError(err: unknown) {
  if (err instanceof ApiError) {
    const code = err.statusCode === 404 ? status.NOT_FOUND : status.INVALID_ARGUMENT;
    return { code, message: err.message };
  }
  return { code: status.INTERNAL, message: 'Internal error' };
}

export async function getEmployee(
  call: ServerUnaryCall<GetEmployeeRequest, EmployeeResponse>,
  callback: sendUnaryData<EmployeeResponse>,
) {
  try {
    const employee = await employeeService.getEmployeeById(call.request.employeeId);
    callback(null, toGrpcResponse(employee));
  } catch (err) {
    callback(toGrpcError(err) as any, null as any);
  }
}


export async function getEmployeesForPayroll(
   call: ServerWritableStream<GetEmployeesForPayrollRequest, EmployeeResponse>,
) {
  try {
    let page = 1;
    const limit = 15;
    const maxRecords = 100;
    let totalSent = 0;

    const { departmentId, employmentStatus } = call.request;

    while (totalSent < maxRecords) {
      const currentLimit = Math.min(limit, maxRecords - totalSent);

      const { items, pagination } = await employeeService.listEmployees({
        page,
        limit: currentLimit,
        departmentId: departmentId || undefined,
        employmentStatus: (employmentStatus || undefined) as any,
      });

      if (!items || items.length === 0) break;

      for (const item of items) {
        if (call.cancelled) return;

        call.write(toGrpcResponse(item));
        totalSent++;

        if (totalSent >= maxRecords) break;
      }

      if (page >= pagination.totalPages) break;
      page++;
    }

    call.end();
  } catch (err) {
    call.emit('error', toGrpcError(err));
  }
}