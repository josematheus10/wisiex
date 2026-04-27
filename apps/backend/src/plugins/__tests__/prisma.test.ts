import { describe, it, expect, vi, afterEach } from 'vitest'
import Fastify from 'fastify'

const mockConnect = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockDisconnect = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockFindUnique = vi.hoisted(() => vi.fn().mockResolvedValue(null))
const mockCreate = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'fee-wallet-id', username: 'fee_wallet' }))

vi.mock('@prisma/client', () => ({
  PrismaClient: class MockPrismaClient {
    $connect = mockConnect
    $disconnect = mockDisconnect
    user = {
      findUnique: mockFindUnique,
      create: mockCreate,
    }
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

  it('does not create fee wallet when it already exists', async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 'existing-fee-wallet', username: 'fee_wallet' })

    app = Fastify({ logger: false })
    await registerPrisma(app)
    await app.ready()

    expect(mockCreate).not.toHaveBeenCalled()
  })
})
