import type { FastifyInstance } from 'fastify'
import { Decimal } from '@prisma/client/runtime/library'
import { enqueueOrder } from '../services/order-queue.js'
import { getOrderBook } from '../services/order-book.js'
import { serializeOrder } from '../services/serializers.js'

interface CreateOrderBody {
  side: 'BUY' | 'SELL'
  price: string
  amount: string
}

export async function ordersRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateOrderBody }>('/', {
    preHandler: [app.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['side', 'price', 'amount'],
        properties: {
          side: { type: 'string', enum: ['BUY', 'SELL'] },
          price: { type: 'string' },
          amount: { type: 'string' },
        },
      },
    },
    async handler(request, reply) {
      const { side, price, amount } = request.body
      const userId = request.user.userId

      const decimalAmount = new Decimal(amount)
      const decimalPrice = new Decimal(price)
      const cost = decimalAmount.mul(decimalPrice)

      const user = await app.prisma.user.findUniqueOrThrow({ where: { id: userId } })

      if (side === 'BUY') {
        if (new Decimal(user.usdBalance.toString()).lt(cost)) {
          return reply.status(400).send({ error: 'Insufficient balance' })
        }
      } else {
        if (new Decimal(user.btcBalance.toString()).lt(decimalAmount)) {
          return reply.status(400).send({ error: 'Insufficient balance' })
        }
      }

      const order = await app.prisma.$transaction(async (tx) => {
        if (side === 'BUY') {
          await tx.user.update({
            where: { id: userId },
            data: { usdBalance: { decrement: cost.toNumber() } },
          })
        } else {
          await tx.user.update({
            where: { id: userId },
            data: { btcBalance: { decrement: decimalAmount.toNumber() } },
          })
        }

        return tx.order.create({
          data: { userId, side, price, amount },
          include: { user: true },
        })
      })

      await enqueueOrder(app.redis, order.id)

      return reply.status(201).send({ order: serializeOrder(order) })
    },
  })

  app.get('/active', {
    preHandler: [app.authenticate],
    async handler(request, reply) {
      const orders = await app.prisma.order.findMany({
        where: {
          userId: request.user.userId,
          status: { in: ['PENDING', 'PARTIAL'] },
        },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      })

      return reply.send({ orders: orders.map(serializeOrder) })
    },
  })

  app.get('/history', {
    preHandler: [app.authenticate],
    async handler(request, reply) {
      const orders = await app.prisma.order.findMany({
        where: {
          userId: request.user.userId,
          status: { in: ['COMPLETED', 'CANCELLED'] },
        },
        include: { user: true },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      })

      return reply.send({ orders: orders.map(serializeOrder) })
    },
  })

  app.delete<{ Params: { id: string } }>('/:id', {
    preHandler: [app.authenticate],
    async handler(request, reply) {
      const order = await app.prisma.order.findUniqueOrThrow({
        where: { id: request.params.id },
      })

      if (order.userId !== request.user.userId) {
        return reply.status(403).send({ error: 'Forbidden' })
      }

      if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
        return reply.status(400).send({ error: 'Order cannot be cancelled' })
      }

      const remaining = Number(order.amount) - Number(order.filled)

      const cancelled = await app.prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
          include: { user: true },
        })

        if (order.side === 'BUY') {
          await tx.user.update({
            where: { id: order.userId },
            data: { usdBalance: { increment: remaining * Number(order.price) } },
          })
        } else {
          await tx.user.update({
            where: { id: order.userId },
            data: { btcBalance: { increment: remaining } },
          })
        }

        return updated
      })

      app.io.to(`user:${order.userId}`).emit('order:update', { order: serializeOrder(cancelled) })

      return reply.send({ order: serializeOrder(cancelled) })
    },
  })

  app.get('/book', {
    async handler(_request, reply) {
      const book = await getOrderBook(app.prisma)
      return reply.send({ orderBook: book })
    },
  })
}
