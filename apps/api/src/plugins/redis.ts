import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { Redis } from 'ioredis'

async function redisPlugin(app: FastifyInstance) {
  const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379')
  app.decorate('redis', redis)
  app.addHook('onClose', async () => {
    await redis.quit()
  })
}

export const registerRedis = fp(redisPlugin)
