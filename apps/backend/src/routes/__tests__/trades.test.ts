import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildTestApp, createMockPrisma } from '../../__helpers__/app.js'
import { tradesRoutes } from '../trades.js'

describe('tradesRoutes GET /trades', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let mockPrisma: ReturnType<typeof createMockPrisma>

  beforeEach(async () => {
    mockPrisma = createMockPrisma()
    app = await buildTestApp(mockPrisma)
    await app.register(tradesRoutes, { prefix: '/trades' })
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  it('returns serialized trades', async () => {
    const createdAt = new Date('2024-01-01T12:00:00.000Z')
    mockPrisma.trade.findMany.mockResolvedValue([
      {
        id: 't1',
        price: { toString: () => '50000' },
        amount: { toString: () => '0.5' },
        makerFee: { toString: () => '0.0025' },
        takerFee: { toString: () => '0.0015' },
        createdAt,
      },
    ])

    const res = await app.inject({ method: 'GET', url: '/trades' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.trades).toHaveLength(1)
    expect(body.trades[0].id).toBe('t1')
    expect(body.trades[0].price).toBe('50000')
    expect(body.trades[0].createdAt).toBe(createdAt.toISOString())
  })

  it('returns empty list when no trades', async () => {
    mockPrisma.trade.findMany.mockResolvedValue([])

    const res = await app.inject({ method: 'GET', url: '/trades' })

    expect(res.statusCode).toBe(200)
    expect(res.json().trades).toEqual([])
  })
})
