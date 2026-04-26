import { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

const prisma = new PrismaClient()

async function prismaPlugin(app: FastifyInstance) {
  await prisma.$connect()
  app.decorate('prisma', prisma)
  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
}

export const registerPrisma = fp(prismaPlugin)
