import { describe, it, expect, vi, afterEach } from 'vitest'
import Fastify from 'fastify'

const mockConnect = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockDisconnect = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('@prisma/client', () => ({
  PrismaClient: class MockPrismaClient {
    $connect = mockConnect
    $disconnect = mockDisconnect
  },
}))

import { registerPrisma } from '../prisma.js'

describe('registerPrisma', () => {
  let app: ReturnType<typeof Fastify>

  afterEach(async () => {
    vi.clearAllMocks()
    await app.close()
  })

  it('connects and decorates app with prisma', async () => {
    app = Fastify({ logger: false })
    await registerPrisma(app)
    await app.ready()

    expect(mockConnect).toHaveBeenCalled()
    expect((app as any).prisma).toBeDefined()
  })

  it('disconnects prisma on app close', async () => {
    app = Fastify({ logger: false })
    await registerPrisma(app)
    await app.ready()
    await app.close()

    expect(mockDisconnect).toHaveBeenCalled()
  })
})
