import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendSuccess } from '../../common/utils/api-response';
import * as regionService from './regions.service';
import type {
  CreateRegionInput,
  ListRegionQuery,
  RegionDetailQuery,
  RegionIdParam,
  UpdateRegionInput,
} from './regions.schema';


// "http://localhost:3002/api/hr/regions?page=1&limit=10&search=Asia"
export async function listRegions(request: FastifyRequest<{ Querystring: ListRegionQuery }>,reply: FastifyReply)
: Promise<void> {
  const { items, pagination } = await regionService.listRegions(request.query);
  sendSuccess(reply, items, 'Regions retrieved succesfully', 200, pagination);
}


export async function getRegionCountry(request: FastifyRequest<{ Params: RegionIdParam; Querystring: RegionDetailQuery }>,reply: FastifyReply): Promise<void> {
  const { id } = request.params;
  const { include } = request.query;

  if (include === 'countries') {
    const region = await regionService.getRegionWithCountries(id);
    sendSuccess(reply, region, 'Region detail with countries retrieved successfully');
    return;
  }

  const region = await regionService.getRegionById(id);
  sendSuccess(reply, region, 'Region detail retrieved successfully');
}

export async function getRegion(request: FastifyRequest<{ Params: RegionIdParam }>,reply: FastifyReply): Promise<void> {
  const { id } = request.params;
  const region = await regionService.getRegionById(id);
  sendSuccess(reply, region, 'Region retrieved successfully');
}

export async function createRegion(request: FastifyRequest<{ Body: CreateRegionInput }>,reply: FastifyReply): Promise<void> {
  const region = await regionService.createRegion(request.body);
  sendSuccess(reply, region, 'Region created successfully', 201);
}

export async function updateRegion(request: FastifyRequest<{ Params: RegionIdParam; Body: UpdateRegionInput }>,reply: FastifyReply): Promise<void> {
  const { id } = request.params;
  const region = await regionService.updateRegion(id, request.body);
  sendSuccess(reply, region, 'Region updated successfully');
}

export async function deleteRegion(request: FastifyRequest<{ Params: RegionIdParam }>,reply: FastifyReply): Promise<void> {
  const { id } = request.params;
  await regionService.deleteRegion(id);
  sendSuccess(reply, null, 'Region deleted successfully');
}