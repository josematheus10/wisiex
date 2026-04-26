import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMarketStats } from '../stats.js'

const d = (v: string) => ({
  toString: () => v,
  minus: (other: any) => d((Number(v) - Number(other.toString())).toString()),
  mul: (other: any) => d((Number(v) * Number(typeof other === 'string' ? other : other.toString())).toString()),
})

describe('getMarketStats', () => {
  const mockPrisma = {
    trade: {
      findFirst: vi.fn(),
      aggregate: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns nulls and zeros when no trades exist', async () => {
    mockPrisma.trade.findFirst.mockResolvedValue(null)
    mockPrisma.trade.aggregate.mockResolvedValue({
      _sum: { amount: null },
      _max: { price: null },
      _min: { price: null },
    })

    const result = await getMarketStats(mockPrisma as any)

    expect(result.lastPrice).toBeNull()
    expect(result.volume24hBtc).toBe('0')
    expect(result.volume24hUsd).toBe('0')
    expect(result.high24h).toBeNull()
    expect(result.low24h).toBeNull()
    expect(result.priceChange24h).toBeNull()
  })

  it('returns stats with last trade but no 24h amount', async () => {
    const lastTrade = { price: d('50000') }
    mockPrisma.trade.findFirst
      .mockResolvedValueOnce(lastTrade)
      .mockResolvedValueOnce(null)
    mockPrisma.trade.aggregate.mockResolvedValue({
      _sum: { amount: null },
      _max: { price: d('55000') },
      _min: { price: d('45000') },
    })

    const result = await getMarketStats(mockPrisma as any)

    expect(result.lastPrice).toBe('50000')
    expect(result.volume24hBtc).toBe('0')
    expect(result.volume24hUsd).toBe('0')
    expect(result.high24h).toBe('55000')
    expect(result.low24h).toBe('45000')
    expect(result.priceChange24h).toBeNull()
  })

  it('calculates volume24hUsd when amount and lastPrice exist', async () => {
    const lastTrade = { price: d('50000') }
    const firstTrade24h = { price: d('48000') }
    mockPrisma.trade.findFirst
      .mockResolvedValueOnce(lastTrade)
      .mockResolvedValueOnce(firstTrade24h)
    mockPrisma.trade.aggregate.mockResolvedValue({
      _sum: { amount: d('10') },
      _max: { price: d('55000') },
      _min: { price: d('45000') },
    })

    const result = await getMarketStats(mockPrisma as any)

    expect(result.lastPrice).toBe('50000')
    expect(result.volume24hBtc).toBe('10')
    expect(result.volume24hUsd).toBe('500000')
    expect(result.priceChange24h).toBe('2000')
  })
})
