import type { FastifyInstance } from 'fastify'
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

      const order = await app.prisma.order.create({
        data: {
          userId,
          side,
          price,
          amount,
        },
        include: { user: true },
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

      const cancelled = await app.prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
        include: { user: true },
      })

      // Refund reserved funds
      const remaining = Number(order.amount) - Number(order.filled)
      if (order.side === 'BUY') {
        await app.prisma.user.update({
          where: { id: order.userId },
          data: { usdBalance: { increment: remaining * Number(order.price) } },
        })
      } else {
        await app.prisma.user.update({
          where: { id: order.userId },
          data: { btcBalance: { increment: remaining } },
        })
      }

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
