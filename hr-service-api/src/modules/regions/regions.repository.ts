import { and, count, eq, ilike, type SQL } from 'drizzle-orm';
import { db } from '../../db';
import { countries, regions } from '../../db/schema';
import type { CreateRegionInput, ListRegionQuery, UpdateRegionInput } from './regions.schema';
import type { RegionRow } from './regions.types';

export async function findAll(filter: ListRegionQuery): Promise<{ rows: RegionRow[]; total: number }> {
    const { page, limit, search } = filter;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (search) {
        conditions.push(ilike(regions.regionName, `%${search}%`));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRow] = await Promise.all([
        db
            .select()
            .from(regions)
            .where(whereClause)
            .limit(limit)
            .offset(offset),
        db.select({ total: count() }).from(regions).where(whereClause),
    ]);

    return { rows, total: totalRow[0]?.total ?? 0 };
}

export async function findById(id: number): Promise<RegionRow | null> {
    const [row] = await db.select().from(regions).where(eq(regions.regionId, id));
    return row ?? null;
}

export async function create(input: CreateRegionInput): Promise<RegionRow> {
    const [row] = await db
        .insert(regions)
        .values({
            regionName: input.regionName,
        })
        .returning();
    return row!;
}

export async function update(id: number, input: UpdateRegionInput): Promise<RegionRow | null> {
    const [row] = await db
        .update(regions)
        .set({
            regionName: input.regionName,
        })
        .where(eq(regions.regionId, id))
        .returning();
    return row ?? null;
}

export async function remove(id: number): Promise<boolean> {
    const result = await db
        .delete(regions)
        .where(eq(regions.regionId, id))
        .returning({ regionId: regions.regionId });
    return result.length > 0;
}

export async function findByIdWithCountries(id: number) {
  const rows = await db
    .select({
      regionId: regions.regionId,
      regionName: regions.regionName,
      country: {
        countryId: countries.countryId,
        countryName: countries.countryName,
      },
    })
    .from(regions)
    .leftJoin(countries, eq(countries.regionId, regions.regionId))
    .where(eq(regions.regionId, id));

  if (rows.length === 0) return null;


  return {
    regionId: rows[0].regionId,
    regionName: rows[0].regionName,
    countries: rows
      .filter((r) => r.country?.countryId !== null)
      .map((r) => r.country),
  };
}