import type { FastifyInstance } from 'fastify'
import { getMarketStats } from '../services/stats.js'

export async function statsRoutes(app: FastifyInstance) {
  app.get('/', {
    async handler(_request, reply) {
      const stats = await getMarketStats(app.prisma)
      return reply.send({ stats })
    },
  })
}
