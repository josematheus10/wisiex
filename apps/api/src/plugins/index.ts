import type { FastifyInstance } from 'fastify'
import { registerCors } from './cors.js'
import { registerJwt } from './jwt.js'
import { registerPrisma } from './prisma.js'
import { registerRedis } from './redis.js'
import { registerSocket } from './socket.js'

export async function registerPlugins(app: FastifyInstance) {
  await registerCors(app)
  await registerJwt(app)
  await registerPrisma(app)
  await registerRedis(app)
  await registerSocket(app)
}
