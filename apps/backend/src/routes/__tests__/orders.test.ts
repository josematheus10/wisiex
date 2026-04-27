import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildTestApp, createMockPrisma, createMockIo, makeOrder } from '../../__helpers__/app.js'
import { ordersRoutes } from '../orders.js'

vi.mock('../../services/order-queue.js', () => ({
  enqueueOrder: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../services/order-book.js', () => ({
  getOrderBook: vi.fn().mockResolvedValue({ bids: [], asks: [] }),
}))

import { enqueueOrder } from '../../services/order-queue.js'

describe('ordersRoutes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let mockPrisma: ReturnType<typeof createMockPrisma>
  let mockIo: ReturnType<typeof createMockIo>
  let token: string

  beforeEach(async () => {
    vi.clearAllMocks()
    mockPrisma = createMockPrisma()
    mockIo = createMockIo()
    app = await buildTestApp(mockPrisma, {}, mockIo)
    await app.register(ordersRoutes, { prefix: '/orders' })
    await app.ready()
    token = app.jwt.sign({ userId: 'user1', username: 'alice' })
  })

  afterEach(async () => {
    await app.close()
  })

  it('POST / creates a BUY order atomically and enqueues it', async () => {
    const orderRow = makeOrder()
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma))
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.order.create.mockResolvedValue(orderRow)

    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: { Authorization: `Bearer ${token}` },
      payload: { side: 'BUY', price: '50000', amount: '0.5' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.order.side).toBe('BUY')
    expect(enqueueOrder).toHaveBeenCalledWith({}, 'order1')
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ usdBalance: expect.any(Object) }) }),
    )
  })

  it('POST / creates a SELL order atomically and deducts BTC', async () => {
    const orderRow = makeOrder({ side: 'SELL' })
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma))
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.order.create.mockResolvedValue(orderRow)

    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: { Authorization: `Bearer ${token}` },
      payload: { side: 'SELL', price: '50000', amount: '0.5' },
    })

    expect(res.statusCode).toBe(201)
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ btcBalance: expect.any(Object) }) }),
    )
  })

  it('POST / returns 400 when insufficient USD for BUY (conditional update returns 0)', async () => {
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma))
    mockPrisma.user.updateMany.mockResolvedValue({ count: 0 })

    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: { Authorization: `Bearer ${token}` },
      payload: { side: 'BUY', price: '50000', amount: '0.5' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('Insufficient balance')
  })

  it('POST / returns 400 when insufficient BTC for SELL (conditional update returns 0)', async () => {
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma))
    mockPrisma.user.updateMany.mockResolvedValue({ count: 0 })

    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: { Authorization: `Bearer ${token}` },
      payload: { side: 'SELL', price: '50000', amount: '0.5' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('Insufficient balance')
  })

  it('POST / returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: { side: 'BUY', price: '50000', amount: '0.5' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('POST / returns 400 with invalid side', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: { Authorization: `Bearer ${token}` },
      payload: { side: 'INVALID', price: '50000', amount: '0.5' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST / re-throws non-balance errors from transaction', async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error('DB connection error'))

    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: { Authorization: `Bearer ${token}` },
      payload: { side: 'BUY', price: '50000', amount: '0.5' },
    })

    expect(res.statusCode).toBe(500)
  })

  it('GET /active returns active orders', async () => {
    mockPrisma.order.findMany.mockResolvedValue([makeOrder()])

    const res = await app.inject({
      method: 'GET',
      url: '/orders/active',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().orders).toHaveLength(1)
  })

  it('GET /active returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/orders/active' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /history returns historical orders', async () => {
    mockPrisma.order.findMany.mockResolvedValue([makeOrder({ status: 'COMPLETED' })])

    const res = await app.inject({
      method: 'GET',
      url: '/orders/history',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().orders).toHaveLength(1)
  })

  it('GET /history returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/orders/history' })
    expect(res.statusCode).toBe(401)
  })

  it('DELETE /:id cancels BUY order atomically and refunds USD', async () => {
    const order = makeOrder({
      id: 'order1',
      userId: 'user1',
      side: 'BUY',
      price: { toString: () => '50000' },
      amount: { toString: () => '1' },
      filled: { toString: () => '0' },
      status: 'PENDING',
    })
    mockPrisma.order.findUniqueOrThrow.mockResolvedValue(order)
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma))
    mockPrisma.order.update.mockResolvedValue({ ...order, status: 'CANCELLED' })
    mockPrisma.user.update.mockResolvedValue(undefined)
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const res = await app.inject({
      method: 'DELETE',
      url: '/orders/order1',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce()
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ usdBalance: expect.any(Object) }) }),
    )
  })

  it('DELETE /:id cancels SELL order atomically and refunds BTC', async () => {
    const order = makeOrder({
      id: 'order1',
      userId: 'user1',
      side: 'SELL',
      price: { toString: () => '50000' },
      amount: { toString: () => '1' },
      filled: { toString: () => '0.3' },
      status: 'PARTIAL',
    })
    mockPrisma.order.findUniqueOrThrow.mockResolvedValue(order)
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma))
    mockPrisma.order.update.mockResolvedValue({ ...order, status: 'CANCELLED' })
    mockPrisma.user.update.mockResolvedValue(undefined)
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const res = await app.inject({
      method: 'DELETE',
      url: '/orders/order1',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce()
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ btcBalance: expect.any(Object) }) }),
    )
  })

  it('DELETE /:id emits order:update and balance:update socket events after cancel', async () => {
    const order = makeOrder({
      id: 'order1',
      userId: 'user1',
      side: 'BUY',
      price: { toString: () => '50000' },
      amount: { toString: () => '1' },
      filled: { toString: () => '0' },
      status: 'PENDING',
    })
    const updatedUser = { btcBalance: { toString: () => '1' }, usdBalance: { toString: () => '50000' } }
    mockPrisma.order.findUniqueOrThrow.mockResolvedValue(order)
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma))
    mockPrisma.order.update.mockResolvedValue({ ...order, status: 'CANCELLED' })
    mockPrisma.user.update.mockResolvedValue(undefined)
    mockPrisma.user.findUnique.mockResolvedValue(updatedUser)

    await app.inject({
      method: 'DELETE',
      url: '/orders/order1',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(mockIo.to).toHaveBeenCalledWith('user:user1')
    expect(mockIo._roomEmit).toHaveBeenCalledWith('order:update', expect.objectContaining({ order: expect.any(Object) }))
    expect(mockIo._roomEmit).toHaveBeenCalledWith('balance:update', { btcBalance: '1', usdBalance: '50000' })
  })

  it('DELETE /:id skips balance:update emission when user not found after cancel', async () => {
    const order = makeOrder({
      id: 'order1',
      userId: 'user1',
      side: 'BUY',
      price: { toString: () => '50000' },
      amount: { toString: () => '1' },
      filled: { toString: () => '0' },
      status: 'PENDING',
    })
    mockPrisma.order.findUniqueOrThrow.mockResolvedValue(order)
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma))
    mockPrisma.order.update.mockResolvedValue({ ...order, status: 'CANCELLED' })
    mockPrisma.user.update.mockResolvedValue(undefined)
    mockPrisma.user.findUnique.mockResolvedValue(null)

    await app.inject({
      method: 'DELETE',
      url: '/orders/order1',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(mockIo._roomEmit).toHaveBeenCalledWith('order:update', expect.any(Object))
    expect(mockIo._roomEmit).not.toHaveBeenCalledWith('balance:update', expect.anything())
  })

  it('DELETE /:id returns 403 with ownership error when order belongs to another user', async () => {
    const order = makeOrder({ id: 'order1', userId: 'other-user' })
    mockPrisma.order.findUniqueOrThrow.mockResolvedValue(order)

    const res = await app.inject({
      method: 'DELETE',
      url: '/orders/order1',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('Unauthorized to cancel this order')
  })

  it('DELETE /:id returns 400 when order is already COMPLETED', async () => {
    const order = makeOrder({ id: 'order1', userId: 'user1', status: 'COMPLETED' })
    mockPrisma.order.findUniqueOrThrow.mockResolvedValue(order)

    const res = await app.inject({
      method: 'DELETE',
      url: '/orders/order1',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(400)
  })

  it('DELETE /:id returns 400 when order is already CANCELLED', async () => {
    const order = makeOrder({ id: 'order1', userId: 'user1', status: 'CANCELLED' })
    mockPrisma.order.findUniqueOrThrow.mockResolvedValue(order)

    const res = await app.inject({
      method: 'DELETE',
      url: '/orders/order1',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(400)
  })

  it('DELETE /:id returns 401 without token', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/orders/order1' })
    expect(res.statusCode).toBe(401)
  })

  it('DELETE /:id returns 404 when order not found (error message contains "record")', async () => {
    mockPrisma.order.findUniqueOrThrow.mockRejectedValue(new Error('No record found'))

    const res = await app.inject({
      method: 'DELETE',
      url: '/orders/order1',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(404)
    expect(res.json().error).toBe('Order not found')
  })

  it('DELETE /:id re-throws generic errors from findUniqueOrThrow', async () => {
    mockPrisma.order.findUniqueOrThrow.mockRejectedValue(new Error('DB connection error'))

    const res = await app.inject({
      method: 'DELETE',
      url: '/orders/order1',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(500)
  })

  it('GET /book returns order book', async () => {
    const res = await app.inject({ method: 'GET', url: '/orders/book' })

    expect(res.statusCode).toBe(200)
    expect(res.json().orderBook).toEqual({ bids: [], asks: [] })
  })
})
