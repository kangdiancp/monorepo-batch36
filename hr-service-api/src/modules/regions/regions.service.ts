import { ApiError } from '../../common/utils/api-error';
import type { Pagination } from '../../common/utils/api-response';
import * as regionRepository from './regions.repository';
import type { CreateRegionInput, ListRegionQuery, UpdateRegionInput } from './regions.schema';
import type { RegionRow } from './regions.types';

export async function listRegions(filter: ListRegionQuery): Promise<{ items: RegionRow[]; pagination: Pagination }> {
  const { rows, total } = await regionRepository.findAll(filter);

  return {
    items: rows,
    pagination: {
      page: filter.page,
      limit: filter.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filter.limit)),
    },
  };
}

export async function getRegionById(id: number): Promise<RegionRow> {
  const region = await regionRepository.findById(id);
  if (!region) {
    throw ApiError.notFound(`Region with id ${id} not found`);
  }
  return region;
}

export async function getRegionWithCountries(id: number) {
  const region = await regionRepository.findByIdWithCountries(id);
  if (!region) {
    throw ApiError.notFound(`Region with id ${id} not found`);
  }
  return region;
}

export async function createRegion(input: CreateRegionInput): Promise<RegionRow> {
  return regionRepository.create({
    ...input,
    regionName: input.regionName.trim(),
  });
}

export async function updateRegion(id: number, input: UpdateRegionInput): Promise<RegionRow> {
  const existing = await regionRepository.findById(id);
  if (!existing) {
    throw ApiError.notFound(`Region with id ${id} not found`);
  }

  const updated = await regionRepository.update(id, {
    regionName: input.regionName,
  });

  if (!updated) {
    throw ApiError.notFound(`Region with id ${id} not found`);
  }
  return updated;
}

export async function deleteRegion(id: number): Promise<void> {
  const existing = await regionRepository.findById(id);
  if (!existing) {
    throw ApiError.notFound(`Region with id ${id} not found`);
  }

  await regionRepository.remove(id);
}