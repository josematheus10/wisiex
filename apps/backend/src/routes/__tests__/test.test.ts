import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildTestApp, createMockPrisma } from '../../__helpers__/app.js'
import { testRoutes } from '../test.js'

describe('testRoutes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let mockPrisma: ReturnType<typeof createMockPrisma>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'test')
    mockPrisma = createMockPrisma()
    app = await buildTestApp(mockPrisma)
    await app.register(testRoutes, { prefix: '/test' })
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
    vi.unstubAllEnvs()
  })

  it('DELETE /reset clears all data and resets user balances', async () => {
    mockPrisma.trade.deleteMany.mockResolvedValue(undefined)
    mockPrisma.order.deleteMany.mockResolvedValue(undefined)
    mockPrisma.user.updateMany.mockResolvedValue(undefined)
    mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]))

    const res = await app.inject({ method: 'DELETE', url: '/test/reset' })

    expect(res.statusCode).toBe(200)
    expect(res.json().ok).toBe(true)
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce()
  })

  it('PUT /users/:username/balance updates user balance', async () => {
    mockPrisma.user.update.mockResolvedValue(undefined)

    const res = await app.inject({
      method: 'PUT',
      url: '/test/users/alice/balance',
      payload: { btcBalance: '50', usdBalance: '50000' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().ok).toBe(true)
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { username: 'alice' },
        data: { btcBalance: '50', usdBalance: '50000' },
      }),
    )
  })

  it('PUT /users/:username/balance returns 400 when body is missing', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/test/users/alice/balance',
      payload: {},
    })

    expect(res.statusCode).toBe(400)
  })

  it('does not register routes in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const prodApp = await buildTestApp(createMockPrisma())
    await prodApp.register(testRoutes, { prefix: '/test' })
    await prodApp.ready()

    const res = await prodApp.inject({ method: 'DELETE', url: '/test/reset' })
    expect(res.statusCode).toBe(404)

    await prodApp.close()
  })
})
