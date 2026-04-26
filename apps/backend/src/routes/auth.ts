import type { FastifyInstance } from 'fastify'

interface LoginBody {
  username: string
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: LoginBody }>('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['username'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 32 },
        },
      },
    },
    async handler(request, reply) {
      const { username } = request.body

      const user = await app.prisma.user.upsert({
        where: { username },
        create: { username },
        update: {},
      })

      const token = app.jwt.sign({ userId: user.id, username: user.username })

      return reply.send({
        token,
        user: {
          id: user.id,
          username: user.username,
          btcBalance: user.btcBalance.toString(),
          usdBalance: user.usdBalance.toString(),
          createdAt: user.createdAt.toISOString(),
        },
      })
    },
  })
}
