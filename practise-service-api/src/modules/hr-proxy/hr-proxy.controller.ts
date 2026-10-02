import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendSuccess } from '../../common/utils/api-response';
import * as hrProxyService from './hr-proxy.service';
import type { CreateDepartmentInput, EmployeeIdParam } from './hr-proxy.schema';


export async function getEmployee(
  request: FastifyRequest<{ Params: EmployeeIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  const employee = await hrProxyService.getEmployeeById(request.params.id);
  sendSuccess(reply, employee, 'Successfully retrieved employee from hr-service-api (gRPC)');
}

export async function listDepartments(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const departments = await hrProxyService.getAllDepartments();
  sendSuccess(reply, departments, 'Successfully retrieved department list from hr-service-api (gRPC)');
}

export async function createDepartments(
  request: FastifyRequest<{ Body: CreateDepartmentInput }>,
  reply: FastifyReply,
): Promise<void> {
  const department = await hrProxyService.createNewDepartment(request.body.department_name);
  sendSuccess(reply, department, 'Successfully created department in hr-service-api (gRPC)', 201);
}

/* 
export async function getEmployee(
  request: FastifyRequest<{ Params: EmployeeIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  const employee = await hrProxyService.getEmployeeById(request.params.id);
  sendSuccess(reply, employee, 'Employee berhasil diambil dari hr-service-api (gRPC)');
}

export async function listDepartments(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const departments = await hrProxyService.getAllDepartments();
  sendSuccess(reply, departments, 'List department berhasil diambil dari hr-service-api (gRPC)');
}

export async function createDepartments(
  request: FastifyRequest<{ Body: CreateDepartmentInput }>,
  reply: FastifyReply,
): Promise<void> {
  const department = await hrProxyService.createNewDepartment(request.body.department_name);
  sendSuccess(reply, department, 'Create department sukses ke hr-service-api (gRPC)', 201);
} */