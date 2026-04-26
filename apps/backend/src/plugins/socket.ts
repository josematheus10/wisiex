import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { Server } from 'socket.io'
import { corsOriginResolver } from './cors-origin.js'

async function socketPlugin(app: FastifyInstance) {
  const io = new Server(app.server, {
    cors: {
      origin: corsOriginResolver,
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    app.log.info(`Socket connected: ${socket.id}`)

    socket.on('auth', async (token: string) => {
      try {
        const payload = app.jwt.verify<{ userId: string }>(token)
        socket.join(`user:${payload.userId}`)
        socket.emit('auth:ok')
      } catch {
        socket.emit('auth:error', 'Invalid token')
      }
    })

    socket.on('disconnect', () => {
      app.log.info(`Socket disconnected: ${socket.id}`)
    })
  })

  app.decorate('io', io)
  app.addHook('onClose', async () => {
    await new Promise<void>((resolve) => io.close(() => resolve()))
  })
}

export const registerSocket = fp(socketPlugin)
