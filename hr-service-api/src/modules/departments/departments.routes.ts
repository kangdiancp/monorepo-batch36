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
    //if using response : ntar data serialize : pake fast-json-schema -> lebih cepat
    //tanpa pake respons : ntar data serialize pake json.stringfy()
    fastify.get(
        '/', // url api/hr/departments?page=1&limit=5&search=Asia
        {
            schema: {
                tags: ['Departments'],
                querystring: listDepartmentQuerySchema, //validator
                response: {
                    200: createApiListResponseSchema(departmentSchema),
                }, // return data yg datang dari controller itu hold dulu, saat return data {departmenID, departmentName}
                // filtering
            },//schema bisa sebagai validator & filtering pada 
        },
        departmentController.listDepartments,//controller, data : {departmenID, departmentName, locationId}
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