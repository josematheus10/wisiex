import type { FastifyInstance } from 'fastify'
import { authRoutes } from './auth.js'
import { meRoutes } from './me.js'
import { ordersRoutes } from './orders.js'
import { statsRoutes } from './stats.js'
import { tradesRoutes } from './trades.js'

export async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(meRoutes, { prefix: '/me' })
  await app.register(ordersRoutes, { prefix: '/orders' })
  await app.register(tradesRoutes, { prefix: '/trades' })
  await app.register(statsRoutes, { prefix: '/stats' })
}
