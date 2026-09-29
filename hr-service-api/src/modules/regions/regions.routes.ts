import type { FastifyPluginAsync } from 'fastify';
import * as regionController from './regions.controller';
import {
    createRegionBodySchema,
    listRegionQuerySchema,
    regionDetailQuerySchema,
    regionIdParamSchema,
    updateRegionBodySchema,
} from './regions.schema';

/**
 * Endpoint URL : 
 * # 1. GET LIST
curl -X GET "http://localhost:3000/api/hr/regions?page=1&limit=10"

# 2. CREATE
curl -X POST "http://localhost:3000/api/hr/regions" \
  -H "Content-Type: application/json" \
  -d '{"regionName": "Southeast Asia"}'

# 3. UPDATE
curl -X PATCH "http://localhost:3000/api/hr/regions/1" \
  -H "Content-Type: application/json" \
  -d '{"regionName": "East Asia"}'

# 4. DELETE
curl -X DELETE "http://localhost:3000/api/hr/regions/1"

# 5. GET DETAIL
curl -X GET "http://localhost:3000/api/hr/regions/1?includeCountries=true"
 * 
 */

export const regionRoutes: FastifyPluginAsync = async (fastify) => {
    //"http://localhost:3000/api/hr/regions?page=1&limit=10&search=an"
    //"http://localhost:3000/api/hr/regions?page=1&limit=10"
    //"http://localhost:3000/api/hr/regions"
    fastify.get(
        '/',
        { schema: { querystring: listRegionQuerySchema } },
        regionController.listRegions,
    );

    fastify.post(
        '/',
        { schema: { body: createRegionBodySchema } },
        regionController.createRegion,
    );

    fastify.patch(
        '/:id',
        { schema: { params: regionIdParamSchema, body: updateRegionBodySchema } },
        regionController.updateRegion,
    );

    fastify.delete(
        '/:id',
        { schema: { params: regionIdParamSchema } },
        regionController.deleteRegion,
    );

    fastify.get(
        '/:id',
        { schema: { params: regionIdParamSchema, querystring: regionDetailQuerySchema } },
        regionController.getRegionCountry,
    );
};