import type { FastifyInstance } from 'fastify'
import { serializeTrade } from '../services/serializers.js'

export async function tradesRoutes(app: FastifyInstance) {
  app.get('/', {
    async handler(_request, reply) {
      const trades = await app.prisma.trade.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      return reply.send({ trades: trades.map(serializeTrade) })
    },
  })
}
