import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildTestApp, createMockPrisma } from '../../__helpers__/app.js'
import { meRoutes } from '../me.js'

describe('meRoutes GET /me', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let mockPrisma: ReturnType<typeof createMockPrisma>

  beforeEach(async () => {
    mockPrisma = createMockPrisma()
    app = await buildTestApp(mockPrisma)
    await app.register(meRoutes, { prefix: '/me' })
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  it('returns user data for authenticated request', async () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z')
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user1',
      username: 'alice',
      btcBalance: { toString: () => '100' },
      usdBalance: { toString: () => '100000' },
      createdAt,
    })

    const token = app.jwt.sign({ userId: 'user1', username: 'alice' })

    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.username).toBe('alice')
    expect(body.btcBalance).toBe('100')
    expect(body.usdBalance).toBe('100000')
    expect(body.createdAt).toBe(createdAt.toISOString())
  })

  it('returns 401 without a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/me' })
    expect(res.statusCode).toBe(401)
  })
})
