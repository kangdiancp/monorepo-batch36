import type { FastifyPluginAsync } from 'fastify';
import * as payrollRunController from './payroll-run.controller';
import {
  approvePayrollRunBodySchema,
  cancelPayrollRunBodySchema,
  createPayrollRunBodySchema,
  listPayrollRunQuerySchema,
  payrollRunIdParamSchema,
  updatePayrollRunBodySchema,
} from './payroll-run.schema';

export const payrollRunRoutes: FastifyPluginAsync = async (fastify) => {
  const byId = { schema: { params: payrollRunIdParamSchema } };

  fastify.get('/', { schema: { querystring: listPayrollRunQuerySchema } }, payrollRunController.listPayrollRuns);
  fastify.get('/:id', byId, payrollRunController.getPayrollRun);
  
  fastify.post('/', { schema: { body: createPayrollRunBodySchema } }, payrollRunController.createPayrollRun);
  
  fastify.patch(
    '/:id',
    { schema: { params: payrollRunIdParamSchema, body: updatePayrollRunBodySchema } },
    payrollRunController.updatePayrollRun,
  );
  fastify.delete('/:id', byId, payrollRunController.deletePayrollRun);

  // Preview tampilkan dulu employee yg status ACTIVE via gRPC hr-service-api sebelum generate
  fastify.get('/:id/eligible-employees', byId, payrollRunController.getEligibleEmployees);

  // --- Generate (DRAFT -> PROCESSING -> REVIEW, async lewat BullMQ) ---
  fastify.post('/:id/generate', byId, payrollRunController.generatePayrollRun);
  fastify.get('/:id/progress', byId, payrollRunController.getPayrollRunProgress);

  // --- Khusus untuk approval bagi directur finance dan direktur utama ---
  fastify.post(
    '/:id/approve',
    { schema: { params: payrollRunIdParamSchema, body: approvePayrollRunBodySchema } },
    payrollRunController.approvePayrollRun,
  );
  fastify.post(
    '/:id/cancel',
    { schema: { params: payrollRunIdParamSchema, body: cancelPayrollRunBodySchema } },
    payrollRunController.cancelPayrollRun,
  );
};