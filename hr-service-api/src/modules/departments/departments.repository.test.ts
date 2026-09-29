import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestDb, truncateAll, type TestDb } from '../../../tests/helpers/test-db' 

let testDb: TestDb
let client: Awaited<ReturnType<typeof createTestDb>>['client']

// Ganti module `db` yang di-import repository (`import { db } from '../../db'`)
// dengan instance PGlite kita. Gunakan Getter `testDb` 
// agar saat call repository
// masih bisa pnaggil `db.select()` dst — bukan `undefined` saat mock didaftarkan.
vi.mock('../../db', () => ({
  get db() {
    return testDb
  },
}))

// Import SETELAH vi.mock supaya repository memakai db versi mock di atas.
const departmentRepository = await import('./departments.repository')
const { regions, countries, locations } = await import('../../db/schema') 

beforeAll(async () => {
  const setup = await createTestDb()
  testDb = setup.db
  client = setup.client
})


async function seedLocation() {
  const [region] = await testDb.insert(regions).values({ regionName: 'Asia Pacific' }).returning()

  const [country] = await testDb
    .insert(countries)
    .values({ countryId: 'ID', countryName: 'Indonesia', regionId: region.regionId })
    .returning()

  const [location] = await testDb
    .insert(locations)
    .values({ city: 'Jakarta', countryId: country.countryId })
    .returning()

  return location
}

afterAll(async () => {
  await client.close()
})

beforeEach(async () => {
  await truncateAll(testDb)
})

describe('departments.repository (PGlite)', () => {
  it('create() save new department tanpa location', async () => {
    const row = await departmentRepository.create({
      department_name: 'Engineering',
      location_id: null,
    })

    expect(row.departmentId).toBeGreaterThan(0)
    expect(row.departmentName).toBe('Engineering')
    expect(row.locationId).toBeNull()
  })

  it('create() gagal (FK violation) kalau location_id tidak ada di tabel locations', async () => {
    await expect(
      departmentRepository.create({ department_name: 'Engineering', location_id: 9999 }),
    ).rejects.toThrow()
  })

  it('create() sukses kalau location_id valid', async () => {
    const location = await seedLocation()

    const row = await departmentRepository.create({
      department_name: 'Engineering',
      location_id: location.locationId,
    })

    expect(row.locationId).toBe(location.locationId)
  })

  it('findById() return null kalau tidak ditemukan', async () => {
    const row = await departmentRepository.findById(9999)
    expect(row).toBeNull()
  })

  it('update() hanya meng-update field yang dikirim (partial)', async () => {
    const created = await departmentRepository.create({
      department_name: 'Engineering',
      location_id: null,
    })

    // Send location_id — department_name TIDAK boleh berubah/ dibuat null.
    const updated = await departmentRepository.update(created.departmentId, {
      location_id: null,
    })

    expect(updated?.departmentName).toBe('Engineering') 
  })

  it('remove() return true jika berhasil didelete, false kalau tidak ada', async () => {
    const created = await departmentRepository.create({
      department_name: 'Engineering',
      location_id: null,
    })

    await expect(departmentRepository.remove(created.departmentId)).resolves.toBe(true)
    await expect(departmentRepository.remove(created.departmentId)).resolves.toBe(false)
  })

  it('findAll() filter by search (ilike) & pagination', async () => {
    await departmentRepository.create({ department_name: 'Engineering', location_id: null })
    await departmentRepository.create({ department_name: 'Marketing', location_id: null })
    await departmentRepository.create({ department_name: 'Engineering Ops', location_id: null })

    const { rows, total } = await departmentRepository.findAll({
      page: 1,
      limit: 20,
      search: 'engineering',
    })

    expect(total).toBe(2)
    expect(rows.map((r) => r.departmentName).sort()).toEqual(['Engineering', 'Engineering Ops'])
  })
})