import { ApiError } from '../../common/utils/api-error';
import { DepartmentResponse, EmployeeResponse } from '../../grpc/generated/employee';
import { getEmployee, listDepartments, createDepartment } from '../../grpc/hr-service.client';


export async function getEmployeeById(id: number): Promise<EmployeeResponse> {
  const employee = await getEmployee(id);
  if (!employee) {
    throw ApiError.notFound(`Employee dengan id ${id} tidak ditemukan di hr-service`);
  }
  return employee;
}

export async function getAllDepartments(): Promise<DepartmentResponse[]> {
  return listDepartments();
}

export async function createNewDepartment(departmentName: string): Promise<DepartmentResponse> {
  return createDepartment(departmentName);
}