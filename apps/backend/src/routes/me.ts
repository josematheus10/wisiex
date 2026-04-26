import type { FastifyInstance } from 'fastify'

export async function meRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [app.authenticate],
    async handler(request, reply) {
      const user = await app.prisma.user.findUniqueOrThrow({
        where: { id: request.user.userId },
      })

      return reply.send({
        id: user.id,
        username: user.username,
        btcBalance: user.btcBalance.toString(),
        usdBalance: user.usdBalance.toString(),
        createdAt: user.createdAt.toISOString(),
      })
    },
  })
}
