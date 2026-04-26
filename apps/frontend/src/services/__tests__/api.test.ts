import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import {
  apiLogin,
  apiMe,
  apiCreateOrder,
  apiCancelOrder,
  apiActiveOrders,
  apiOrderHistory,
  apiOrderBook,
  apiTrades,
  apiStats,
} from '../api.js'

function mockJsonResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(data),
  }
}

describe('api service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('apiLogin sends POST to /auth/login', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ token: 'tok', user: { id: 'u1' } }))

    const result = await apiLogin('alice')

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ username: 'alice' }),
    }))
    expect(result.token).toBe('tok')
  })

  it('apiMe sends GET /me with Bearer token', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ user: { id: 'u1' } }))

    await apiMe('my-token')

    expect(mockFetch).toHaveBeenCalledWith('/api/me', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer my-token' }),
    }))
  })

  it('apiCreateOrder sends POST /orders', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ order: { id: 'o1' } }))

    await apiCreateOrder({ side: 'BUY', price: '50000', amount: '1' }, 'my-token')

    expect(mockFetch).toHaveBeenCalledWith('/api/orders', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('apiCancelOrder sends DELETE /orders/:id', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ order: { id: 'o1' } }))

    await apiCancelOrder('order1', 'my-token')

    expect(mockFetch).toHaveBeenCalledWith('/api/orders/order1', expect.objectContaining({
      method: 'DELETE',
    }))
  })

  it('apiActiveOrders sends GET /orders/active', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ orders: [] }))

    await apiActiveOrders('my-token')

    expect(mockFetch).toHaveBeenCalledWith('/api/orders/active', expect.any(Object))
  })

  it('apiOrderHistory sends GET /orders/history', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ orders: [] }))

    await apiOrderHistory('my-token')

    expect(mockFetch).toHaveBeenCalledWith('/api/orders/history', expect.any(Object))
  })

  it('apiOrderBook sends GET /orders/book without auth', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ orderBook: { bids: [], asks: [] } }))

    await apiOrderBook()

    expect(mockFetch).toHaveBeenCalledWith('/api/orders/book', expect.any(Object))
  })

  it('apiTrades sends GET /trades', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ trades: [] }))

    await apiTrades()

    expect(mockFetch).toHaveBeenCalledWith('/api/trades', expect.any(Object))
  })

  it('apiStats sends GET /stats', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ stats: {} }))

    await apiStats()

    expect(mockFetch).toHaveBeenCalledWith('/api/stats', expect.any(Object))
  })

  it('throws error with message from response body when not ok', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ error: 'Unauthorized' }, false, 401))

    await expect(apiMe('bad-token')).rejects.toThrow('Unauthorized')
  })

  it('throws statusText when error body has no error field', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
      json: vi.fn().mockResolvedValue({}),
    })

    await expect(apiStats()).rejects.toThrow('Not Found')
  })

  it('throws statusText when json parsing fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
      json: vi.fn().mockRejectedValue(new Error('parse error')),
    })

    await expect(apiStats()).rejects.toThrow('Internal Server Error')
  })
})
