import type { FastifyPluginAsync } from 'fastify';
import * as departmentController from './departments.controller';
import {
    createApiListResponseSchema,
    createApiResponseSchema,
    apiEmptyResponseSchema,
} from '../../common/utils/api-response-schema';
import {
    createDepartmentBodySchema,
    departmentIdParamSchema,
    departmentSchema,
    listDepartmentQuerySchema,
    updateDepartmentBodySchema,
} from './departments.schema';

export const departmentRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get(
        '/',
        {
            schema: {
                tags: ['Departments'],
                querystring: listDepartmentQuerySchema,
                response: {
                    200: createApiListResponseSchema(departmentSchema),
                },
            },
        },
        departmentController.listDepartments,
    );

    fastify.get(
        '/:id',
        {
            schema: {
                tags: ['Departments'],
                params: departmentIdParamSchema,
                response: {
                    200: createApiResponseSchema(departmentSchema),
                },
            },
        },
        departmentController.getDepartment,
    );

    fastify.post(
        '/',
        {
            schema: {
                tags: ['Departments'],
                summary: 'Create a new department',
                description: 'Create New Department',
                body: createDepartmentBodySchema,
                response: { 201: createApiResponseSchema(departmentSchema) },
            },
        },
        departmentController.createDepartment,
    );

    fastify.patch(
        '/:id',
        {
            schema: {
                tags: ['Departments'],
                params: departmentIdParamSchema,
                body: updateDepartmentBodySchema,
                response: {
                    200: createApiResponseSchema(departmentSchema),
                },
            },
        },
        departmentController.updateDepartment,
    );

    fastify.delete(
        '/:id',
        {
            schema: {
                tags: ['Departments'],
                params: departmentIdParamSchema,
                response: {
                    200: apiEmptyResponseSchema,
                },
            },
        },
        departmentController.deleteDepartment,
    );
};