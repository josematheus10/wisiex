import { describe, it, expect, vi } from 'vitest'
import Fastify from 'fastify'

vi.mock('../auth.js', () => ({ authRoutes: vi.fn() }))
vi.mock('../me.js', () => ({ meRoutes: vi.fn() }))
vi.mock('../orders.js', () => ({ ordersRoutes: vi.fn() }))
vi.mock('../stats.js', () => ({ statsRoutes: vi.fn() }))
vi.mock('../trades.js', () => ({ tradesRoutes: vi.fn() }))

import { registerRoutes } from '../index.js'

describe('registerRoutes', () => {
  it('registers all route plugins', async () => {
    const app = Fastify({ logger: false })
    const registerSpy = vi.spyOn(app, 'register')

    await registerRoutes(app)
    await app.ready()

    expect(registerSpy).toHaveBeenCalledTimes(5)
    await app.close()
  })
})
