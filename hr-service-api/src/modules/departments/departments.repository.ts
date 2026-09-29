import { and, count, eq, ilike, type SQL } from 'drizzle-orm';
import { db } from '../../db';
import { departments } from '../../db/schema';
import type { CreateDepartmentInput, ListDepartmentQuery, UpdateDepartmentInput } from './departments.schema';
import type { DepartmentRow } from './departments.types';

export async function findAll(filter: ListDepartmentQuery): Promise<{ rows: DepartmentRow[]; total: number }> {
    const { page, limit, search, locationId } = filter;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (search) {
        conditions.push(ilike(departments.departmentName, `%${search}%`));
    }
    if (locationId) {
        conditions.push(eq(departments.locationId, locationId));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRow] = await Promise.all([
        db
            .select()
            .from(departments)
            .where(whereClause)
            .limit(limit)
            .offset(offset),
        db.select({ total: count() }).from(departments).where(whereClause),
    ]);

    return { rows, total: totalRow[0]?.total ?? 0 };
}

export async function findById(id: number): Promise<DepartmentRow | null> {
    const [row] = await db.select().from(departments).where(eq(departments.departmentId, id));
    return row ?? null;
}

export async function create(input: CreateDepartmentInput): Promise<DepartmentRow> {
    const [row] = await db
        .insert(departments)
        .values({
            departmentName: input.department_name,
            locationId: input.location_id ?? null,
        })
        .returning();
    return row!;
}

export async function update(id: number, input: UpdateDepartmentInput): Promise<DepartmentRow | null> {

    const [row] = await db
        .update(departments)
        .set({
            ...(input.department_name !== undefined && { departmentName: input.department_name }),
            ...(input.location_id !== undefined && { locationId: input.location_id }),
        })
        .where(eq(departments.departmentId, id))
        .returning();
    return row ?? null;
}

export async function remove(id: number): Promise<boolean> {
    const result = await db
        .delete(departments)
        .where(eq(departments.departmentId, id))
        .returning({ departmentId: departments.departmentId });
    return result.length > 0;
}