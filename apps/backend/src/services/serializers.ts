import { Decimal } from '@prisma/client/runtime/library'

interface RawOrder {
  id: string
  userId: string
  user: { username: string }
  side: string
  price: { toString(): string }
  amount: { toString(): string }
  filled: { toString(): string }
  status: string
  createdAt: Date
  updatedAt: Date
}

interface RawTrade {
  id: string
  price: { toString(): string }
  amount: { toString(): string }
  makerFee: { toString(): string }
  takerFee: { toString(): string }
  createdAt: Date
}

export function serializeOrder(order: RawOrder) {
  const amount = new Decimal(order.amount.toString())
  const filled = new Decimal(order.filled.toString())
  return {
    id: order.id,
    userId: order.userId,
    username: order.user.username,
    side: order.side,
    price: order.price.toString(),
    amount: amount.toString(),
    filled: filled.toString(),
    remaining: amount.minus(filled).toString(),
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  }
}

export function serializeTrade(trade: RawTrade) {
  return {
    id: trade.id,
    price: trade.price.toString(),
    amount: trade.amount.toString(),
    makerFee: trade.makerFee.toString(),
    takerFee: trade.takerFee.toString(),
    createdAt: trade.createdAt.toISOString(),
  }
}
