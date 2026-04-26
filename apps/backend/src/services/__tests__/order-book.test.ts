import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getOrderBook } from '../order-book.js'

describe('getOrderBook', () => {
  const mockPrisma = {
    order: {
      groupBy: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty bids and asks when no orders exist', async () => {
    mockPrisma.order.groupBy.mockResolvedValue([])

    const result = await getOrderBook(mockPrisma as any)

    expect(result.bids).toEqual([])
    expect(result.asks).toEqual([])
  })

  it('maps bids correctly computing net amount and total', async () => {
    mockPrisma.order.groupBy
      .mockResolvedValueOnce([
        {
          price: { toString: () => '50000' },
          _sum: { amount: { toString: () => '2' }, filled: { toString: () => '0.5' } },
          _count: 3,
        },
      ])
      .mockResolvedValueOnce([])

    const result = await getOrderBook(mockPrisma as any)

    expect(result.bids).toHaveLength(1)
    expect(result.bids[0]!.price).toBe('50000')
    expect(result.bids[0]!.amount).toBe('1.5')
    expect(result.bids[0]!.total).toBe('75000')
    expect(result.bids[0]!.count).toBe(3)
    expect(result.asks).toEqual([])
  })

  it('maps asks correctly', async () => {
    mockPrisma.order.groupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          price: { toString: () => '51000' },
          _sum: { amount: { toString: () => '1' }, filled: { toString: () => '0' } },
          _count: 1,
        },
      ])

    const result = await getOrderBook(mockPrisma as any)

    expect(result.asks).toHaveLength(1)
    expect(result.asks[0]!.price).toBe('51000')
    expect(result.asks[0]!.amount).toBe('1')
    expect(result.asks[0]!.count).toBe(1)
  })

  it('handles null sum fields by treating them as zero', async () => {
    mockPrisma.order.groupBy
      .mockResolvedValueOnce([
        {
          price: { toString: () => '50000' },
          _sum: { amount: null, filled: null },
          _count: 1,
        },
      ])
      .mockResolvedValueOnce([])

    const result = await getOrderBook(mockPrisma as any)

    expect(result.bids[0]!.amount).toBe('0')
    expect(result.bids[0]!.total).toBe('0')
  })
})
