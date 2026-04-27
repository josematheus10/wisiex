import type { FastifyInstance } from 'fastify'

interface SetBalanceBody {
  btcBalance: string
  usdBalance: string
}

export async function testRoutes(app: FastifyInstance) {
  if (process.env['NODE_ENV'] === 'production') return

  app.delete('/reset', {
    async handler(_request, reply) {
      await app.prisma.$transaction([
        app.prisma.trade.deleteMany({}),
        app.prisma.order.deleteMany({}),
        app.prisma.user.updateMany({ data: { btcBalance: 100, usdBalance: 100000 } }),
      ])
      
      await app.prisma.user.update({
        where: { username: 'fee_wallet' },
        data: { btcBalance: 0, usdBalance: 0 },
      })
      
      return reply.send({ ok: true })
    },
  })

  app.put<{ Params: { username: string }; Body: SetBalanceBody }>('/users/:username/balance', {
    schema: {
      body: {
        type: 'object',
        required: ['btcBalance', 'usdBalance'],
        properties: {
          btcBalance: { type: 'string' },
          usdBalance: { type: 'string' },
        },
      },
    },
    async handler(request, reply) {
      const { username } = request.params
      const { btcBalance, usdBalance } = request.body
      const btcVal = parseFloat(btcBalance)
      const usdVal = parseFloat(usdBalance)
      if (isNaN(btcVal) || btcVal < 0 || isNaN(usdVal) || usdVal < 0) {
        return reply.status(400).send({ error: 'Invalid balance value' })
      }
      await app.prisma.user.update({
        where: { username },
        data: { btcBalance, usdBalance },
      })
      return reply.send({ ok: true })
    },
  })
}
