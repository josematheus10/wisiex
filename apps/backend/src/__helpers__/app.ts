import { vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import fastifyJwt from '@fastify/jwt'

export function createMockPrisma(): Record<string, any> {
  return {
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    order: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
      deleteMany: vi.fn(),
    },
    trade: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  }
}

export function createMockIo(): Record<string, any> {
  const roomEmit: any = vi.fn()
  const to: any = vi.fn().mockReturnValue({ emit: roomEmit })
  return {
    emit: vi.fn(),
    to,
    _roomEmit: roomEmit,
  }
}

export async function buildTestApp(
  prisma: Record<string, any> = createMockPrisma(),
  redis: Record<string, unknown> = {},
  io: Record<string, any> = createMockIo(),
): Promise<FastifyInstance & { prisma: Record<string, any>; io: Record<string, any> }> {
  const app = Fastify({ logger: false }) as any

  await app.register(fastifyJwt, { secret: 'test-secret' })

  app.decorate('prisma', prisma)
  app.decorate('redis', redis)
  app.decorate('io', io)

  app.decorate(
    'authenticate',
    async (request: any, reply: any) => {
      try {
        await request.jwtVerify()
      } catch {
        reply.status(401).send({ error: 'Unauthorized' })
      }
    },
  )

  return app
}

export function makeDecimal(value: string) {
  return { toString: () => value }
}

export function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order1',
    userId: 'user1',
    user: { username: 'alice' },
    side: 'BUY',
    price: makeDecimal('50000'),
    amount: makeDecimal('1'),
    filled: makeDecimal('0'),
    status: 'PENDING',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}
