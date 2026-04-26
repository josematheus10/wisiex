import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import type { Server } from 'socket.io'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
    redis: Redis
    io: Server
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }

  interface FastifyRequest {
    user: {
      userId: string
      username: string
    }
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; username: string }
    user: { userId: string; username: string }
  }
}
