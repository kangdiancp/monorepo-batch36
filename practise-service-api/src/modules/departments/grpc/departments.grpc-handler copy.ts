import type { sendUnaryData, ServerUnaryCall, ServerWritableStream } from '@grpc/grpc-js';
import { status } from '@grpc/grpc-js';
import * as departmentService from '../departments.service';
import { ApiError } from '../../../common/utils/api-error';

function toGrpcResponse(row: { departmentId: number; departmentName: string }) {
  return {
    department_id: row.departmentId,
    department_name: row.departmentName,
  };
}

function toEmployeePreview(row: {
  employeeId: number
  firstName: string | null
  lastName: string
  email: string
  employmentStatus: string
}) {
  return {
    employee_id: row.employeeId,
    first_name: row.firstName ?? '',
    last_name: row.lastName,
    email: row.email,
    employment_status: row.employmentStatus,
  }
}


export async function getDepartmentWithEmployees(
  call: ServerUnaryCall<{ department_id: number }, unknown>, 
  callback: sendUnaryData<any>) {
  try {
    const result = await departmentService.getDepartmentWithEmployeePreview(call.request.department_id)

    callback(null, {
      department_id: result.department.departmentId,
      department_name: result.department.departmentName,
      employees: result.employees.map(toEmployeePreview),
      total_employees: result.totalEmployees,
    })
    
  } catch (err) {
    callback(toGrpcError(err) as any, null)
  }
}

export async function listDepartments(call: ServerWritableStream<Record<string, never>, unknown>) {
  try {
    const { items } = await departmentService.listDepartments({ page: 1, limit: 1000 });
    for (const item of items) call.write(toGrpcError(item));
    call.end();
  } catch (err) {
    call.emit('error', { code: status.INTERNAL, message: (err as Error).message });
  }
}

export async function createDepartment(
  call: ServerUnaryCall<{ department_name: string }, unknown>,
  callback: sendUnaryData<ReturnType<typeof toGrpcResponse>>,
) {
  try {
    const dept = await departmentService.createDepartment({ department_name: call.request.department_name })
    callback(null, toGrpcResponse(dept))
  } catch (err) {
    callback(toGrpcError(err) as any, null)
  }
}

export async function updateDepartment(
  call: ServerUnaryCall<{ department_id: number; department_name?: string }, unknown>,
  callback: sendUnaryData<ReturnType<typeof toGrpcResponse>>,
) {
  try {
    const dept = await departmentService.updateDepartment(call.request.department_id, {
      department_name: call.request.department_name,
    })
    callback(null, toGrpcResponse(dept))
  } catch (err) {
    callback(toGrpcError(err) as any, null)
  }
}

export async function deleteDepartment(
  call: ServerUnaryCall<{ department_id: number }, unknown>,
  callback: sendUnaryData<{ success: boolean }>,
) {
  try {
    await departmentService.deleteDepartment(call.request.department_id)
    callback(null, { success: true })
  } catch (err) {
    callback(toGrpcError(err) as any, null)
  }
}

function toGrpcError(err: unknown) {
  if (err instanceof ApiError) {
    const code = err.statusCode === 404 ? status.NOT_FOUND : status.INVALID_ARGUMENT
    return { code, message: err.message }
  }
  return { code: status.INTERNAL, message: 'Internal error' }
}
