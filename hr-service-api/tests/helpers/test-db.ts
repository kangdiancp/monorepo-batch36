import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { sql } from 'drizzle-orm'
import path from 'node:path'
import * as schema from '../../src/db/schema' 

export type TestDb = ReturnType<typeof drizzle<typeof schema>>

export async function createTestDb(): Promise<{ db: TestDb; client: PGlite }> {
  const client = new PGlite() //create object pglite
  const db = drizzle(client, { schema })

  // gunakan path.resolve spy dapat working directory, agar file drizzle.config.ts di root
  const migrationsFolder = path.resolve(process.cwd(), 'drizzle') 

  console.log('[test-db] migrationsFolder:', migrationsFolder)

  await migrate(db, { migrationsFolder })

  // Debug: cek apakah table masuk ke pglite untuk schema hr setelah migrate.
  const result = await db.execute(
    sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'hr'`,
  )
  console.log('[test-db] tabel yang ter-create di schema hr:', result.rows)

  if (result.rows.length === 0) {
    throw new Error(
      `[test-db] TIDAK ADA tabel ter-create di schema "hr". migrationsFolder yang dipakai: ${migrationsFolder}. ` +
      `Cek apakah folder ini benar (lihat field "out" di drizzle.config.ts) dan berisi file .sql + meta/_journal.json hasil "drizzle-kit generate".`,
    )
  }

  return { db, client }
}

export async function truncateAll(db: TestDb): Promise<void> {
  await db.execute(sql`
    TRUNCATE TABLE
      hr.dependents,
      hr.employees,
      hr.departments,
      hr.jobs,
      hr.locations,
      hr.countries,
      hr.regions
    RESTART IDENTITY CASCADE;
  `)
}