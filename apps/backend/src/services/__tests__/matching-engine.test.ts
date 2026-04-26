import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../order-book.js', () => ({
  getOrderBook: vi.fn().mockResolvedValue({ bids: [], asks: [] }),
}))
vi.mock('../stats.js', () => ({
  getMarketStats: vi.fn().mockResolvedValue({ lastPrice: null, volume24hBtc: '0', volume24hUsd: '0', high24h: null, low24h: null, priceChange24h: null }),
}))

import { matchOrder } from '../matching-engine.js'

function makePrismaOrder(overrides: Record<string, any> = {}) {
  return {
    id: 'maker1',
    userId: 'maker-user',
    side: 'SELL',
    price: { toString: () => '50000', lte: () => false, gte: () => true },
    amount: { toString: () => '1' },
    filled: { toString: () => '0' },
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createTxMock(
  makerBalance: any = { btcBalance: { toString: () => '50' }, usdBalance: { toString: () => '200000' } },
  takerBalance: any = { btcBalance: { toString: () => '99' }, usdBalance: { toString: () => '50000' } },
  updatedMakerUser = { username: 'maker' },
) {
  const updatedMaker = {
    id: 'maker1',
    userId: 'maker-user',
    side: 'SELL',
    price: { toString: () => '50000' },
    amount: { toString: () => '1' },
    filled: { toString: () => '0.5' },
    status: 'PARTIAL',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: updatedMakerUser,
  }
  return {
    trade: { create: vi.fn().mockResolvedValue({ id: 'trade1', createdAt: new Date() }) },
    order: {
      update: vi.fn()
        .mockResolvedValueOnce(updatedMaker)
        .mockResolvedValueOnce(undefined),
    },
    user: {
      update: vi.fn().mockResolvedValue(undefined),
      findUnique: vi.fn()
        .mockResolvedValueOnce(makerBalance)
        .mockResolvedValueOnce(takerBalance),
    },
  }
}

describe('matchOrder', () => {
  let mockPrisma: any
  let mockIo: any

  beforeEach(() => {
    mockIo = {
      emit: vi.fn(),
      to: vi.fn().mockReturnValue({ emit: vi.fn() }),
    }
    mockPrisma = {
      order: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(),
    }
  })

  it('returns early when taker is not found', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null)

    await matchOrder(mockPrisma, mockIo, 'order1')

    expect(mockPrisma.order.findMany).not.toHaveBeenCalled()
  })

  it('returns early when taker is CANCELLED', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(makePrismaOrder({ id: 'o1', status: 'CANCELLED' }))

    await matchOrder(mockPrisma, mockIo, 'o1')

    expect(mockPrisma.order.findMany).not.toHaveBeenCalled()
  })

  it('returns early when taker is COMPLETED', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(makePrismaOrder({ id: 'o1', status: 'COMPLETED' }))

    await matchOrder(mockPrisma, mockIo, 'o1')

    expect(mockPrisma.order.findMany).not.toHaveBeenCalled()
  })

  it('emits orderbook and stats when no candidates match', async () => {
    const taker = makePrismaOrder({ id: 'taker1', side: 'BUY', status: 'PENDING' })
    mockPrisma.order.findUnique.mockResolvedValue(taker)
    mockPrisma.order.findMany.mockResolvedValue([])

    await matchOrder(mockPrisma, mockIo, 'taker1')

    expect(mockIo.emit).toHaveBeenCalledWith('orderbook', expect.any(Object))
    expect(mockIo.emit).toHaveBeenCalledWith('stats', expect.any(Object))
  })

  it('executes BUY order matching against SELL candidates', async () => {
    const taker = {
      id: 'taker1',
      userId: 'taker-user',
      side: 'BUY',
      price: { toString: () => '51000' },
      amount: { toString: () => '0.5' },
      filled: { toString: () => '0' },
      status: 'PENDING',
    }
    const maker = makePrismaOrder({
      id: 'maker1',
      userId: 'maker-user',
      side: 'SELL',
      price: { toString: () => '50000' },
      amount: { toString: () => '1' },
      filled: { toString: () => '0' },
      status: 'PENDING',
    })

    mockPrisma.order.findUnique.mockResolvedValue(taker)
    mockPrisma.order.findMany.mockResolvedValue([maker])

    const txMock = createTxMock()
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(txMock))

    await matchOrder(mockPrisma, mockIo, 'taker1')

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(txMock.trade.create).toHaveBeenCalledTimes(1)
    expect(mockIo.emit).toHaveBeenCalledWith('trade', expect.any(Object))
    expect(mockIo.emit).toHaveBeenCalledWith('orderbook', expect.any(Object))
    expect(mockIo.emit).toHaveBeenCalledWith('stats', expect.any(Object))
  })

  it('executes SELL order matching against BUY candidates', async () => {
    const taker = {
      id: 'taker1',
      userId: 'taker-user',
      side: 'SELL',
      price: { toString: () => '49000' },
      amount: { toString: () => '0.5' },
      filled: { toString: () => '0' },
      status: 'PENDING',
    }
    const maker = {
      id: 'maker1',
      userId: 'maker-user',
      side: 'BUY',
      price: { toString: () => '50000' },
      amount: { toString: () => '1' },
      filled: { toString: () => '0' },
      status: 'PENDING',
    }

    mockPrisma.order.findUnique.mockResolvedValue(taker)
    mockPrisma.order.findMany.mockResolvedValue([maker])

    const txMock = createTxMock()
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(txMock))

    await matchOrder(mockPrisma, mockIo, 'taker1')

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(txMock.trade.create).toHaveBeenCalledTimes(1)
  })

  it('emits balance:update to maker and taker rooms', async () => {
    const taker = {
      id: 'taker1',
      userId: 'taker-user',
      side: 'BUY',
      price: { toString: () => '51000' },
      amount: { toString: () => '0.5' },
      filled: { toString: () => '0' },
      status: 'PENDING',
    }
    const maker = makePrismaOrder({ amount: { toString: () => '1' }, filled: { toString: () => '0' } })

    mockPrisma.order.findUnique.mockResolvedValue(taker)
    mockPrisma.order.findMany.mockResolvedValue([maker])

    const roomEmit = vi.fn()
    mockIo.to.mockReturnValue({ emit: roomEmit })

    const txMock = createTxMock()
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(txMock))

    await matchOrder(mockPrisma, mockIo, 'taker1')

    expect(roomEmit).toHaveBeenCalledWith('balance:update', expect.objectContaining({ btcBalance: expect.any(String) }))
  })

  it('handles null makerBalance and takerBalance gracefully', async () => {
    const taker = {
      id: 'taker1',
      userId: 'taker-user',
      side: 'BUY',
      price: { toString: () => '51000' },
      amount: { toString: () => '0.5' },
      filled: { toString: () => '0' },
      status: 'PENDING',
    }
    const maker = makePrismaOrder()

    mockPrisma.order.findUnique.mockResolvedValue(taker)
    mockPrisma.order.findMany.mockResolvedValue([maker])

    const txMock = createTxMock(null, null)
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(txMock))

    await expect(matchOrder(mockPrisma, mockIo, 'taker1')).resolves.toBeUndefined()
  })

  it('stops iterating when takerRemaining reaches zero', async () => {
    const taker = {
      id: 'taker1',
      userId: 'taker-user',
      side: 'BUY',
      price: { toString: () => '51000' },
      amount: { toString: () => '0.5' },
      filled: { toString: () => '0' },
      status: 'PENDING',
    }
    const maker1 = makePrismaOrder({ id: 'maker1', amount: { toString: () => '1' }, filled: { toString: () => '0' } })
    const maker2 = makePrismaOrder({ id: 'maker2', amount: { toString: () => '1' }, filled: { toString: () => '0' } })

    mockPrisma.order.findUnique.mockResolvedValue(taker)
    mockPrisma.order.findMany.mockResolvedValue([maker1, maker2])

    let callCount = 0
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      callCount++
      const txMock = createTxMock()
      return cb(txMock)
    })

    await matchOrder(mockPrisma, mockIo, 'taker1')

    expect(callCount).toBe(1)
  })

  it('marks maker as COMPLETED when fully filled', async () => {
    const taker = {
      id: 'taker1',
      userId: 'taker-user',
      side: 'BUY',
      price: { toString: () => '51000' },
      amount: { toString: () => '2' },
      filled: { toString: () => '0' },
      status: 'PENDING',
    }
    const maker = makePrismaOrder({
      id: 'maker1',
      userId: 'maker-user',
      side: 'SELL',
      price: { toString: () => '50000' },
      amount: { toString: () => '0.5' },
      filled: { toString: () => '0' },
      status: 'PENDING',
    })

    mockPrisma.order.findUnique.mockResolvedValue(taker)
    mockPrisma.order.findMany.mockResolvedValue([maker])

    const completedMaker = {
      id: 'maker1',
      userId: 'maker-user',
      side: 'SELL',
      price: { toString: () => '50000' },
      amount: { toString: () => '0.5' },
      filled: { toString: () => '0.5' },
      status: 'COMPLETED',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { username: 'maker' },
    }
    const txMock = {
      trade: { create: vi.fn().mockResolvedValue({ id: 'trade1', createdAt: new Date() }) },
      order: {
        update: vi.fn()
          .mockResolvedValueOnce(completedMaker)
          .mockResolvedValueOnce(undefined),
      },
      user: {
        update: vi.fn().mockResolvedValue(undefined),
        findUnique: vi.fn()
          .mockResolvedValueOnce({ btcBalance: { toString: () => '50' }, usdBalance: { toString: () => '200000' } })
          .mockResolvedValueOnce({ btcBalance: { toString: () => '101' }, usdBalance: { toString: () => '75000' } }),
      },
    }
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(txMock))

    await matchOrder(mockPrisma, mockIo, 'taker1')

    expect(txMock.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'COMPLETED' }),
    }))
  })

  it('marks taker as PARTIAL when not fully filled in one match', async () => {
    const taker = {
      id: 'taker1',
      userId: 'taker-user',
      side: 'BUY',
      price: { toString: () => '51000' },
      amount: { toString: () => '2' },
      filled: { toString: () => '0' },
      status: 'PENDING',
    }
    const maker = makePrismaOrder({
      id: 'maker1',
      amount: { toString: () => '0.5' },
      filled: { toString: () => '0' },
    })

    mockPrisma.order.findUnique.mockResolvedValue(taker)
    mockPrisma.order.findMany.mockResolvedValue([maker])

    const txMock = createTxMock()
    txMock.order.update = vi.fn()
      .mockResolvedValueOnce({ ...maker, status: 'COMPLETED', user: { username: 'maker' } })
      .mockResolvedValueOnce(undefined)
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(txMock))

    await matchOrder(mockPrisma, mockIo, 'taker1')

    expect(txMock.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'PARTIAL' }),
    }))
  })

  it('emits order:update for maker via io.to', async () => {
    const taker = {
      id: 'taker1',
      userId: 'taker-user',
      side: 'BUY',
      price: { toString: () => '51000' },
      amount: { toString: () => '0.5' },
      filled: { toString: () => '0' },
      status: 'PENDING',
    }
    const maker = makePrismaOrder()

    mockPrisma.order.findUnique.mockResolvedValue(taker)
    mockPrisma.order.findMany.mockResolvedValue([maker])

    const roomEmit = vi.fn()
    mockIo.to.mockReturnValue({ emit: roomEmit })

    const txMock = createTxMock()
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(txMock))

    await matchOrder(mockPrisma, mockIo, 'taker1')

    expect(roomEmit).toHaveBeenCalledWith('order:update', expect.any(Object))
  })
})
