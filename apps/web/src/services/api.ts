import type {
  CreateOrderRequest,
  LoginResponse,
  Order,
  OrderBook,
  MarketStats,
  Trade,
  User,
} from '@wisiex/shared'

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

export const apiLogin = (username: string) =>
  request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username }),
  })

export const apiMe = (token: string) => request<{ user: User }>('/me', {}, token)

export const apiCreateOrder = (data: CreateOrderRequest, token: string) =>
  request<{ order: Order }>('/orders', { method: 'POST', body: JSON.stringify(data) }, token)

export const apiCancelOrder = (id: string, token: string) =>
  request<{ order: Order }>(`/orders/${id}`, { method: 'DELETE' }, token)

export const apiActiveOrders = (token: string) =>
  request<{ orders: Order[] }>('/orders/active', {}, token)

export const apiOrderHistory = (token: string) =>
  request<{ orders: Order[] }>('/orders/history', {}, token)

export const apiOrderBook = () => request<{ orderBook: OrderBook }>('/orders/book')

export const apiTrades = () => request<{ trades: Trade[] }>('/trades')

export const apiStats = () => request<{ stats: MarketStats }>('/stats')
