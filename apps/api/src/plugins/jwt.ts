import fastifyJwt from '@fastify/jwt'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export async function registerJwt(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: process.env['JWT_SECRET'] ?? 'dev-secret-change-me',
  })

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch {
      reply.status(401).send({ error: 'Unauthorized' })
    }
  })
}
