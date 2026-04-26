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

  it('POST / creates an order and enqueues it', async () => {
    const orderRow = makeOrder()
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

  it('DELETE /:id cancels BUY order and refunds USD', async () => {
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
    mockPrisma.order.update.mockResolvedValue({ ...order, status: 'CANCELLED' })
    mockPrisma.user.update.mockResolvedValue(undefined)

    const res = await app.inject({
      method: 'DELETE',
      url: '/orders/order1',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ usdBalance: expect.any(Object) }) }),
    )
  })

  it('DELETE /:id cancels SELL order and refunds BTC', async () => {
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
    mockPrisma.order.update.mockResolvedValue({ ...order, status: 'CANCELLED' })
    mockPrisma.user.update.mockResolvedValue(undefined)

    const res = await app.inject({
      method: 'DELETE',
      url: '/orders/order1',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ btcBalance: expect.any(Object) }) }),
    )
  })

  it('DELETE /:id returns 403 when order belongs to another user', async () => {
    const order = makeOrder({ id: 'order1', userId: 'other-user' })
    mockPrisma.order.findUniqueOrThrow.mockResolvedValue(order)

    const res = await app.inject({
      method: 'DELETE',
      url: '/orders/order1',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(403)
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

  it('GET /book returns order book', async () => {
    const res = await app.inject({ method: 'GET', url: '/orders/book' })

    expect(res.statusCode).toBe(200)
    expect(res.json().orderBook).toEqual({ bids: [], asks: [] })
  })
})
