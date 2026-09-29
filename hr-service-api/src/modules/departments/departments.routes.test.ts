import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { createTestDb, truncateAll, type TestDb } from '../../../tests/helpers/test-db' // TODO: sesuaikan path

let testDb: TestDb
let client: Awaited<ReturnType<typeof createTestDb>>['client']
let app: FastifyInstance

vi.mock('../../db', () => ({
  get db() {
    return testDb
  },
}))

// Import SETELAH vi.mock, supaya seluruh chain (routes → controller →
// service → repository) memakai db versi PGlite.
const { departmentRoutes } = await import('./departments.routes')

beforeAll(async () => {
  const setup = await createTestDb()
  testDb = setup.db
  client = setup.client

  app = Fastify()
  await app.register(departmentRoutes, { prefix: '/departments' })


  app.setErrorHandler((error: any, _request, reply) => {
    const statusCode = error.statusCode ?? 500
    reply.status(statusCode).send({ success: false, message: error.message })
  })

  await app.ready()
})

afterAll(async () => {
  await app.close()
  await client.close()
})

beforeEach(async () => {
  await truncateAll(testDb)
})

describe('POST /departments', () => {
  it('201 — department created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/departments',
      payload: { department_name: 'Engineering' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.departmentName).toBe('Engineering')
  })

  it('400 — department_name null', async () => {
    const res = await app.inject({ method: 'POST', url: '/departments', payload: {} })
    expect(res.statusCode).toBe(400)
  })

  it('400 — department_name more than 30 karakter', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/departments',
      payload: { department_name: 'A'.repeat(31) },
    })
    expect(res.statusCode).toBe(400)
  })

  it('400 — additionalProperties/fields ditolak', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/departments',
      payload: { department_name: 'Engineering', notAllowedField: 'x' },
    })
    expect(res.statusCode).toBe(201)
  })
})

describe('GET /departments', () => {
  it('200 — list dengan pagination default', async () => {
    await app.inject({ method: 'POST', url: '/departments', payload: { department_name: 'Engineering' } })
    await app.inject({ method: 'POST', url: '/departments', payload: { department_name: 'Marketing' } })

    const res = await app.inject({ method: 'GET', url: '/departments' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toHaveLength(2)
    expect(body.pagination).toEqual(
      expect.objectContaining({ page: 1, limit: 20, total: 2, totalPages: 1 }),
    )
  })

  it('400 — page bukan angka', async () => {
    const res = await app.inject({ method: 'GET', url: '/departments?page=abc' })
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /departments/:id', () => {
  it('200 — department ditemukan', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/departments',
      payload: { department_name: 'Engineering' },
    })
    const { data } = created.json()

    const res = await app.inject({ method: 'GET', url: `/departments/${data.departmentId}` })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.departmentName).toBe('Engineering')
  })

  it('404 — department tidak ditemukan', async () => {
    const res = await app.inject({ method: 'GET', url: '/departments/999999' })
    expect(res.statusCode).toBe(404)
  })

  it('400 — id bukan integer valid', async () => {
    const res = await app.inject({ method: 'GET', url: '/departments/abc' })
    expect(res.statusCode).toBe(400)
  })
})

describe('PATCH /departments/:id', () => {
  it('200 — berhasil update sebagian field', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/departments',
      payload: { department_name: 'Engineering' },
    })
    const { data } = created.json()

    const res = await app.inject({
      method: 'PATCH',
      url: `/departments/${data.departmentId}`,
      payload: { department_name: 'Engineering Ops' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.departmentName).toBe('Engineering Ops')
  })

  it('404 — department tidak ditemukan bro', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/departments/999999',
      payload: { department_name: 'X' },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /departments/:id', () => {
  it('200 — deparment deleted, data null', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/departments',
      payload: { department_name: 'Engineering' },
    })
    const { data } = created.json()

    const res = await app.inject({ method: 'DELETE', url: `/departments/${data.departmentId}` })

    expect(res.statusCode).toBe(200)
    expect(res.json().data).toBeNull()
  })

  it('404 — department not found', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/departments/999999' })
    expect(res.statusCode).toBe(404)
  })
})