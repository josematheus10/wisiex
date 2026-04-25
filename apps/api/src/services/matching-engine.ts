import { type PrismaClient, type Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import type { Server } from 'socket.io'
import { getOrderBook } from './order-book.js'
import { getMarketStats } from './stats.js'

const MAKER_FEE = new Decimal('0.005')
const TAKER_FEE = new Decimal('0.003')

export async function matchOrder(prisma: PrismaClient, io: Server, orderId: string) {
  const taker = await prisma.order.findUnique({ where: { id: orderId } })
  if (!taker || taker.status === 'CANCELLED' || taker.status === 'COMPLETED') return

  const isBuy = taker.side === 'BUY'

  const candidates = await prisma.order.findMany({
    where: {
      side: isBuy ? 'SELL' : 'BUY',
      status: { in: ['PENDING', 'PARTIAL'] },
      price: isBuy ? { lte: taker.price } : { gte: taker.price },
    },
    orderBy: [{ price: isBuy ? 'asc' : 'desc' }, { createdAt: 'asc' }],
  })

  let takerRemaining = new Decimal(taker.amount.toString()).minus(taker.filled.toString())

  for (const maker of candidates) {
    if (takerRemaining.lte(0)) break

    const makerRemaining = new Decimal(maker.amount.toString()).minus(maker.filled.toString())
    const tradeAmount = Decimal.min(takerRemaining, makerRemaining)
    const tradePrice = maker.price

    const makerFee = tradeAmount.mul(MAKER_FEE)
    const takerFee = tradeAmount.mul(TAKER_FEE)

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const trade = await tx.trade.create({
        data: {
          makerId: maker.id,
          takerId: taker.id,
          price: tradePrice,
          amount: tradeAmount.toString(),
          makerFee: makerFee.toString(),
          takerFee: takerFee.toString(),
        },
      })

      const newMakerFilled = new Decimal(maker.filled.toString()).plus(tradeAmount)
      const newTakerFilled = new Decimal(taker.filled.toString()).plus(tradeAmount)

      const makerCompleted = newMakerFilled.gte(maker.amount.toString())
      const takerCompleted = newTakerFilled.gte(taker.amount.toString())

      const updatedMaker = await tx.order.update({
        where: { id: maker.id },
        data: { filled: newMakerFilled.toString(), status: makerCompleted ? 'COMPLETED' : 'PARTIAL' },
        include: { user: true },
      })

      await tx.order.update({
        where: { id: taker.id },
        data: { filled: newTakerFilled.toString(), status: takerCompleted ? 'COMPLETED' : 'PARTIAL' },
      })

      const usdValue = tradeAmount.mul(tradePrice.toString())

      if (isBuy) {
        await tx.user.update({
          where: { id: taker.userId },
          data: { btcBalance: { increment: Number(tradeAmount.minus(takerFee)) } },
        })
        await tx.user.update({
          where: { id: maker.userId },
          data: { usdBalance: { increment: Number(usdValue.minus(makerFee.mul(tradePrice.toString()))) } },
        })
      } else {
        await tx.user.update({
          where: { id: taker.userId },
          data: { usdBalance: { increment: Number(usdValue.minus(takerFee.mul(tradePrice.toString()))) } },
        })
        await tx.user.update({
          where: { id: maker.userId },
          data: { btcBalance: { increment: Number(tradeAmount.minus(makerFee)) } },
        })
      }

      // Broadcast to room
      const makerBalance = await tx.user.findUnique({ where: { id: maker.userId } })
      const takerBalance = await tx.user.findUnique({ where: { id: taker.userId } })

      io.emit('trade', {
        trade: {
          id: trade.id,
          price: tradePrice.toString(),
          amount: tradeAmount.toString(),
          makerFee: makerFee.toString(),
          takerFee: takerFee.toString(),
          createdAt: trade.createdAt.toISOString(),
        },
      })

      const remaining = new Decimal(updatedMaker.amount.toString()).minus(updatedMaker.filled.toString())
      io.to(`user:${maker.userId}`).emit('order:update', {
        order: {
          id: updatedMaker.id,
          userId: updatedMaker.userId,
          username: updatedMaker.user.username,
          side: updatedMaker.side,
          price: updatedMaker.price.toString(),
          amount: updatedMaker.amount.toString(),
          filled: updatedMaker.filled.toString(),
          remaining: remaining.toString(),
          status: updatedMaker.status,
          createdAt: updatedMaker.createdAt.toISOString(),
          updatedAt: updatedMaker.updatedAt.toISOString(),
        },
      })

      if (makerBalance) {
        io.to(`user:${maker.userId}`).emit('balance:update', {
          btcBalance: makerBalance.btcBalance.toString(),
          usdBalance: makerBalance.usdBalance.toString(),
        })
      }
      if (takerBalance) {
        io.to(`user:${taker.userId}`).emit('balance:update', {
          btcBalance: takerBalance.btcBalance.toString(),
          usdBalance: takerBalance.usdBalance.toString(),
        })
      }
    })

    takerRemaining = takerRemaining.minus(tradeAmount)
  }

  const [book, stats] = await Promise.all([getOrderBook(prisma), getMarketStats(prisma)])
  io.emit('orderbook', { orderBook: book })
  io.emit('stats', { stats })
}
