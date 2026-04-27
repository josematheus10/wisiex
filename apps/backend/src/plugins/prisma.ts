import { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

const prisma = new PrismaClient()

async function initializeFeeWallet() {
  const existingWallet = await prisma.user.findUnique({
    where: { username: 'fee_wallet' },
  })

  if (!existingWallet) {
    await prisma.user.create({
      data: {
        username: 'fee_wallet',
        btcBalance: 0,
        usdBalance: 0,
      },
    })
  }
}

async function prismaPlugin(app: FastifyInstance) {
  await prisma.$connect()
  app.decorate('prisma', prisma)
  
  await initializeFeeWallet()
  
  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
}

export const registerPrisma = fp(prismaPlugin)
