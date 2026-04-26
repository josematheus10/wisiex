import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildTestApp, createMockPrisma } from '../../__helpers__/app.js'
import { authRoutes } from '../auth.js'

describe('authRoutes POST /auth/login', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let mockPrisma: ReturnType<typeof createMockPrisma>

  beforeEach(async () => {
    mockPrisma = createMockPrisma()
    app = await buildTestApp(mockPrisma)
    await app.register(authRoutes, { prefix: '/auth' })
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  it('upserts user and returns token with user data', async () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z')
    mockPrisma.user.upsert.mockResolvedValue({
      id: 'user1',
      username: 'alice',
      btcBalance: { toString: () => '100' },
      usdBalance: { toString: () => '100000' },
      createdAt,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'alice' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.token).toBeTypeOf('string')
    expect(body.user.username).toBe('alice')
    expect(body.user.btcBalance).toBe('100')
    expect(body.user.usdBalance).toBe('100000')
    expect(body.user.createdAt).toBe(createdAt.toISOString())
  })

  it('rejects username shorter than 3 characters', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'ab' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('rejects missing username', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {},
    })

    expect(res.statusCode).toBe(400)
  })

  it('rejects username longer than 32 characters', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'a'.repeat(33) },
    })

    expect(res.statusCode).toBe(400)
  })
})
