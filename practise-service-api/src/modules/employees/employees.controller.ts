import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendSuccess } from '../../common/utils/api-response';
import * as employeeService from './employees.service';
import type {
  CreateEmployeeInput,
  EmployeeIdParam,
  ListEmployeeQuery,
  UpdateEmployeeInput,
} from './employees.schema';

export async function listEmployees(
  request: FastifyRequest<{ Querystring: ListEmployeeQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const { items, pagination } = await employeeService.listEmployees(request.query);
  sendSuccess(reply, items, 'Employees retrieved successfully', 200, pagination);
}

export async function getEmployee(
  request: FastifyRequest<{ Params: EmployeeIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = request.params;
  const employee = await employeeService.getEmployeeById(id);
  sendSuccess(reply, employee, 'Employee retrieved successfully');
}

export async function createEmployee(
  request: FastifyRequest<{ Body: CreateEmployeeInput }>,
  reply: FastifyReply,
): Promise<void> {
  const employee = await employeeService.createEmployee(request.body);
  sendSuccess(reply, employee, 'Employee created successfully', 201);
}

export async function updateEmployee(
  request: FastifyRequest<{ Params: EmployeeIdParam; Body: UpdateEmployeeInput }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = request.params;
  const employee = await employeeService.updateEmployee(id, request.body);
  sendSuccess(reply, employee, 'Employee updated successfully');
}

export async function deleteEmployee(
  request: FastifyRequest<{ Params: EmployeeIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = request.params;
  await employeeService.deleteEmployee(id);
  sendSuccess(reply, null, 'Employee deleted successfully');
}