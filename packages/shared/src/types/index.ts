export type OrderSide = 'BUY' | 'SELL'

export type OrderStatus = 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED'

export interface User {
  id: string
  username: string
  btcBalance: string
  usdBalance: string
  createdAt: string
}

export interface Order {
  id: string
  userId: string
  username?: string
  side: OrderSide
  price: string
  amount: string
  filled: string
  remaining: string
  status: OrderStatus
  createdAt: string
  updatedAt: string
}

export interface Trade {
  id: string
  price: string
  amount: string
  side: OrderSide
  makerFee: string
  takerFee: string
  createdAt: string
}

export interface OrderBookEntry {
  price: string
  amount: string
  total: string
  count: number
}

export interface OrderBook {
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
}

export interface MarketStats {
  lastPrice: string | null
  volume24hBtc: string
  volume24hUsd: string
  high24h: string | null
  low24h: string | null
  priceChange24h: string | null
}

// WebSocket event payloads (server → client)
export interface WsTradeEvent {
  trade: Trade
}

export interface WsOrderBookEvent {
  orderBook: OrderBook
}

export interface WsStatsEvent {
  stats: MarketStats
}

export interface WsOrderUpdateEvent {
  order: Order
}

export interface WsBalanceUpdateEvent {
  btcBalance: string
  usdBalance: string
}

// REST payloads
export interface LoginRequest {
  username: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface CreateOrderRequest {
  side: OrderSide
  price: string
  amount: string
}

export interface CreateOrderResponse {
  order: Order
}
