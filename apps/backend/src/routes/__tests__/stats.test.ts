import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildTestApp, createMockPrisma } from '../../__helpers__/app.js'
import { statsRoutes } from '../stats.js'

vi.mock('../../services/stats.js', () => ({
  getMarketStats: vi.fn(),
}))

import { getMarketStats } from '../../services/stats.js'

describe('statsRoutes GET /stats', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let mockPrisma: ReturnType<typeof createMockPrisma>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockPrisma = createMockPrisma()
    app = await buildTestApp(mockPrisma)
    await app.register(statsRoutes, { prefix: '/stats' })
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  it('returns market stats', async () => {
    const mockStats = {
      lastPrice: '50000',
      volume24hBtc: '10',
      volume24hUsd: '500000',
      high24h: '55000',
      low24h: '45000',
      priceChange24h: '2000',
    }
    vi.mocked(getMarketStats).mockResolvedValue(mockStats)

    const res = await app.inject({ method: 'GET', url: '/stats' })

    expect(res.statusCode).toBe(200)
    expect(res.json().stats).toEqual(mockStats)
  })
})
