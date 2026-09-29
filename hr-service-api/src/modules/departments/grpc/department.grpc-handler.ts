import type { sendUnaryData, ServerUnaryCall, ServerWritableStream } from '@grpc/grpc-js';
import { status } from '@grpc/grpc-js';
import * as departmentService from '../departments.service';
import { ApiError } from '../../../common/utils/api-error';
import type {
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  DeleteDepartmentRequest,
  DeleteDepartmentResponse,
  DepartmentResponse,
  ListDepartmentsRequest,
  GetDepartmentRequest,
  DepartmentWithEmployeesResponse,
} from '../../../grpc/generated/employee';

function toGrpcResponse(row: { departmentId: number; departmentName: string }): DepartmentResponse {
  return { departmentId: row.departmentId, departmentName: row.departmentName };
}

function toGrpcError(err: unknown) {
  if (err instanceof ApiError) {
    const code = err.statusCode === 404 ? status.NOT_FOUND : status.INVALID_ARGUMENT;
    return { code, message: err.message };
  }
  return { code: status.INTERNAL, message: 'Internal error' };
}

export async function listDepartments(call: ServerWritableStream<ListDepartmentsRequest, DepartmentResponse>) {
  try {
    const { items } = await departmentService.listDepartments({ page: 1, limit: 1000 });
    for (const item of items) call.write(toGrpcResponse(item)); // <-- FIX
    call.end();
  } catch (err) {
    call.emit('error', toGrpcError(err));
  }
}

export async function createDepartment(
  call: ServerUnaryCall<CreateDepartmentRequest, DepartmentResponse>,
  callback: sendUnaryData<DepartmentResponse>,
) {
  try {
    const dept = await departmentService.createDepartment({ department_name: call.request.departmentName });
    callback(null, toGrpcResponse(dept));
  } catch (err) {
    callback(toGrpcError(err) as any, null as any);
  }
}


export async function updateDepartment(
  call: ServerUnaryCall<UpdateDepartmentRequest, DepartmentResponse>,
  callback: sendUnaryData<ReturnType<typeof toGrpcResponse>>,
) {
  try {
    const dept = await departmentService.updateDepartment(call.request.departmentId, {
      department_name: call.request.departmentName,
    })
    callback(null, toGrpcResponse(dept))
  } catch (err) {
    callback(toGrpcError(err) as any, null)
  }
}

export async function deleteDepartment(
  call: ServerUnaryCall<DeleteDepartmentRequest, DeleteDepartmentResponse>,
  callback: sendUnaryData<{ success: boolean }>,
) {
  try {
    await departmentService.deleteDepartment(call.request.departmentId)
    callback(null, { success: true })
  } catch (err) {
    callback(toGrpcError(err) as any, null)
  }
}

export async function getDepartmentWithEmployees(
  call: ServerUnaryCall<GetDepartmentRequest, DepartmentWithEmployeesResponse>,
  callback: sendUnaryData<DepartmentWithEmployeesResponse>,
) {
  try {
    const result = await departmentService.getDepartmentWithEmployeePreview(call.request.departmentId);
    callback(null, {
      departmentId: result.department.departmentId,
      departmentName: result.department.departmentName,
      employees: result.employees.map((e) => ({
        employeeId: e.employeeId,
        firstName: e.firstName ?? '',
        lastName: e.lastName,
        email: e.email,
        employmentStatus: e.employmentStatus,
      })),
      totalEmployees: result.totalEmployees,
    });
  } catch (err) {
    callback(toGrpcError(err) as any, null as any);
  }
}import type { sendUnaryData, ServerUnaryCall, ServerWritableStream } from '@grpc/grpc-js';
import { status } from '@grpc/grpc-js';
import * as departmentService from '../departments.service';
import { ApiError } from '../../../common/utils/api-error';
import type {
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  DeleteDepartmentRequest,
  DeleteDepartmentResponse,
  DepartmentResponse,
  ListDepartmentsRequest,
  GetDepartmentRequest,
  DepartmentWithEmployeesResponse,
} from '../../../grpc/generated/employee';

function toGrpcResponse(row: { departmentId: number; departmentName: string }): DepartmentResponse {
  return { departmentId: row.departmentId, departmentName: row.departmentName };
}

function toGrpcError(err: unknown) {
  if (err instanceof ApiError) {
    const code = err.statusCode === 404 ? status.NOT_FOUND : status.INVALID_ARGUMENT;
    return { code, message: err.message };
  }
  return { code: status.INTERNAL, message: 'Internal error' };
}

export async function listDepartments(call: ServerWritableStream<ListDepartmentsRequest, DepartmentResponse>) {
  try {
    const { items } = await departmentService.listDepartments({ page: 1, limit: 1000 });
    for (const item of items) call.write(toGrpcResponse(item)); // <-- FIX
    call.end();
  } catch (err) {
    call.emit('error', toGrpcError(err));
  }
}

export async function createDepartment(
  call: ServerUnaryCall<CreateDepartmentRequest, DepartmentResponse>,
  callback: sendUnaryData<DepartmentResponse>,
) {
  try {
    const dept = await departmentService.createDepartment({ department_name: call.request.departmentName });
    callback(null, toGrpcResponse(dept));
  } catch (err) {
    callback(toGrpcError(err) as any, null as any);
  }
}


export async function updateDepartment(
  call: ServerUnaryCall<UpdateDepartmentRequest, DepartmentResponse>,
  callback: sendUnaryData<ReturnType<typeof toGrpcResponse>>,
) {
  try {
    const dept = await departmentService.updateDepartment(call.request.departmentId, {
      department_name: call.request.departmentName,
    })
    callback(null, toGrpcResponse(dept))
  } catch (err) {
    callback(toGrpcError(err) as any, null)
  }
}

export async function deleteDepartment(
  call: ServerUnaryCall<DeleteDepartmentRequest, DeleteDepartmentResponse>,
  callback: sendUnaryData<{ success: boolean }>,
) {
  try {
    await departmentService.deleteDepartment(call.request.departmentId)
    callback(null, { success: true })
  } catch (err) {
    callback(toGrpcError(err) as any, null)
  }
}

export async function getDepartmentWithEmployees(
  call: ServerUnaryCall<GetDepartmentRequest, DepartmentWithEmployeesResponse>,
  callback: sendUnaryData<DepartmentWithEmployeesResponse>,
) {
  try {
    const result = await departmentService.getDepartmentWithEmployeePreview(call.request.departmentId);
    callback(null, {
      departmentId: result.department.departmentId,
      departmentName: result.department.departmentName,
      employees: result.employees.map((e) => ({
        employeeId: e.employeeId,
        firstName: e.firstName ?? '',
        lastName: e.lastName,
        email: e.email,
        employmentStatus: e.employmentStatus,
      })),
      totalEmployees: result.totalEmployees,
    });
  } catch (err) {
    callback(toGrpcError(err) as any, null as any);
  }
}