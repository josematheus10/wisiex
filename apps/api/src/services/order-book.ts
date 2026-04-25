import { type PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import type { OrderBook } from '@wisiex/shared'

export async function getOrderBook(prisma: PrismaClient): Promise<OrderBook> {
  const [rawBids, rawAsks] = await Promise.all([
    prisma.order.groupBy({
      by: ['price'],
      where: { side: 'BUY', status: { in: ['PENDING', 'PARTIAL'] } },
      _sum: { amount: true, filled: true },
      _count: true,
      orderBy: { price: 'desc' },
      take: 20,
    }),
    prisma.order.groupBy({
      by: ['price'],
      where: { side: 'SELL', status: { in: ['PENDING', 'PARTIAL'] } },
      _sum: { amount: true, filled: true },
      _count: true,
      orderBy: { price: 'asc' },
      take: 20,
    }),
  ])

  const toEntry = (row: (typeof rawBids)[number]) => {
    const grossAmount = new Decimal((row._sum.amount ?? 0).toString())
    const filled = new Decimal((row._sum.filled ?? 0).toString())
    const amount = grossAmount.minus(filled)
    const price = new Decimal(row.price.toString())
    return {
      price: price.toString(),
      amount: amount.toString(),
      total: amount.mul(price).toString(),
      count: row._count,
    }
  }

  return {
    bids: rawBids.map(toEntry),
    asks: rawAsks.map(toEntry),
  }
}
