import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendSuccess } from '../../common/utils/api-response';
import * as sagaService from './saga.service';
import type {
  CreateSagaInstanceInput,
  ListSagaInstanceQuery,
  SagaInstanceIdParam,
  SagaTaskParam,
  UpdateSagaTaskInput,
} from './saga.schema';

export async function listSagaInstances(
  request: FastifyRequest<{ Querystring: ListSagaInstanceQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const { items, pagination } = await sagaService.listSagaInstances(request.query);
  sendSuccess(reply, items, 'Daftar saga instance berhasil diambil', 200, pagination);
}

export async function getSagaInstance(
  request: FastifyRequest<{ Params: SagaInstanceIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  const instance = await sagaService.getSagaInstanceById(request.params.id);
  sendSuccess(reply, instance, 'Detail saga instance berhasil diambil');
}

export async function createSagaInstance(
  request: FastifyRequest<{ Body: CreateSagaInstanceInput }>,
  reply: FastifyReply,
): Promise<void> {
  const instance = await sagaService.createSagaInstance(request.body);
  sendSuccess(reply, instance, 'Saga instance berhasil dibuat beserta 12 task-nya', 201);
}

export async function updateSagaTask(
  request: FastifyRequest<{ Params: SagaTaskParam; Body: UpdateSagaTaskInput }>,
  reply: FastifyReply,
): Promise<void> {
  const task = await sagaService.updateTaskStatus(request.params.id, request.params.taskId, request.body);
  sendSuccess(reply, task, 'Status task berhasil diupdate');
}
