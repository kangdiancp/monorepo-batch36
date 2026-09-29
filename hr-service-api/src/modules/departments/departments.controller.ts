import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendSuccess } from '../../common/utils/api-response';
import * as departmentService from './departments.service';
import type {
  CreateDepartmentInput,
  DepartmentIdParam,
  ListDepartmentQuery,
  UpdateDepartmentInput,
} from './departments.schema';

export async function listDepartments(
  request: FastifyRequest<{ Querystring: ListDepartmentQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const { items, pagination } = await departmentService.listDepartments(request.query);
  sendSuccess(reply, items, 'Departments retrieved successfully', 200, pagination);
}

export async function getDepartment(
  request: FastifyRequest<{ Params: DepartmentIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = request.params;
  const department = await departmentService.getDepartmentById(id);
  sendSuccess(reply, department, 'Department retrieved successfully');
}

export async function createDepartment(
  request: FastifyRequest<{ Body: CreateDepartmentInput }>,
  reply: FastifyReply,
): Promise<void> {
  const department = await departmentService.createDepartment(request.body);
  sendSuccess(reply, department, 'Department created successfully', 201);
}

export async function updateDepartment(
  request: FastifyRequest<{ Params: DepartmentIdParam; Body: UpdateDepartmentInput }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = request.params;
  const department = await departmentService.updateDepartment(id, request.body);
  sendSuccess(reply, department, 'Department updated successfully');
}

export async function deleteDepartment(
  request: FastifyRequest<{ Params: DepartmentIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = request.params;
  await departmentService.deleteDepartment(id);
  sendSuccess(reply, null, 'Department deleted successfully');
}