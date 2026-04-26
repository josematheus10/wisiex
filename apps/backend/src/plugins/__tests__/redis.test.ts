import { describe, it, expect, vi, afterEach } from 'vitest'
import Fastify from 'fastify'

const mockQuit = vi.hoisted(() => vi.fn().mockResolvedValue('OK'))

vi.mock('ioredis', () => ({
  Redis: class MockRedis {
    quit = mockQuit
  },
  default: class MockRedis {
    quit = mockQuit
  },
}))

import { registerRedis } from '../redis.js'

describe('registerRedis', () => {
  let app: ReturnType<typeof Fastify>

  afterEach(async () => {
    await app.close()
  })

  it('decorates app with redis instance', async () => {
    app = Fastify({ logger: false })
    await registerRedis(app)
    await app.ready()

    expect((app as any).redis).toBeDefined()
  })

  it('calls redis.quit on app close', async () => {
    app = Fastify({ logger: false })
    await registerRedis(app)
    await app.ready()
    await app.close()

    expect(mockQuit).toHaveBeenCalled()
  })
})
