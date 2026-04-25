import type { PrismaClient } from '@prisma/client'
import type { MarketStats } from '@wisiex/shared'

export async function getMarketStats(prisma: PrismaClient): Promise<MarketStats> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [lastTrade, stats24h] = await Promise.all([
    prisma.trade.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.trade.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { amount: true },
      _max: { price: true },
      _min: { price: true },
    }),
  ])

  const volume24hBtc = stats24h._sum.amount?.toString() ?? '0'
  const lastPrice = lastTrade?.price.toString() ?? null

  let volume24hUsd = '0'
  if (lastPrice && stats24h._sum.amount) {
    volume24hUsd = stats24h._sum.amount.mul(lastTrade!.price).toString()
  }

  const firstTrade24h = await prisma.trade.findFirst({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'asc' },
  })

  const priceChange24h =
    firstTrade24h && lastTrade
      ? lastTrade.price.minus(firstTrade24h.price).toString()
      : null

  return {
    lastPrice,
    volume24hBtc,
    volume24hUsd,
    high24h: stats24h._max.price?.toString() ?? null,
    low24h: stats24h._min.price?.toString() ?? null,
    priceChange24h,
  }
}
