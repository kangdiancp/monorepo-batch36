import type { FastifyPluginAsync } from 'fastify';
import * as employeeController from './employees.controller';
import {
    createApiListResponseSchema,
    createApiResponseSchema,
    apiEmptyResponseSchema,
} from '../../common/utils/api-response-schema';
import {
    createEmployeeBodySchema,
    employeeIdParamSchema,
    employeeSchema,
    listEmployeeQuerySchema,
    updateEmployeeBodySchema,
} from './employees.schema';

export const employeeRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get(
        '/',
        {
            schema: {
                tags: ['Employees'],
                querystring: listEmployeeQuerySchema,
                response: {
                    200: createApiListResponseSchema(employeeSchema),
                },
            },
        },
        employeeController.listEmployees,
    );

    fastify.get(
        '/:id',
        {
            schema: {
                tags: ['Employees'],
                params: employeeIdParamSchema,
                response: {
                    200: createApiResponseSchema(employeeSchema),
                },
            },
        },
        employeeController.getEmployee,
    );

    fastify.post(
        '/',
        {
            schema: {
                tags: ['Employees'],
                body: createEmployeeBodySchema,
                response: {
                    201: createApiResponseSchema(employeeSchema),
                },
            },
        },
        employeeController.createEmployee,
    );

    fastify.patch(
        '/:id',
        {
            schema: {
                tags: ['Employees'],
                params: employeeIdParamSchema,
                body: updateEmployeeBodySchema,
                response: {
                    200: createApiResponseSchema(employeeSchema),
                },
            },
        },
        employeeController.updateEmployee,
    );

    fastify.delete(
        '/:id',
        {
            schema: {
                tags: ['Employees'],
                params: employeeIdParamSchema,
                response: {
                    200: apiEmptyResponseSchema,
                },
            },
        },
        employeeController.deleteEmployee,
    );
};