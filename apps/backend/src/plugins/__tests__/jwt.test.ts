import { describe, it, expect, vi, afterEach } from 'vitest'
import Fastify from 'fastify'
import { registerJwt } from '../jwt.js'

describe('registerJwt', () => {
  let app: ReturnType<typeof Fastify>

  afterEach(async () => {
    await app.close()
  })

  it('registers JWT plugin and authenticate decorator', async () => {
    app = Fastify({ logger: false })
    await registerJwt(app)
    await app.ready()

    expect(typeof app.authenticate).toBe('function')
  })

  it('authenticate rejects request without token', async () => {
    app = Fastify({ logger: false })
    await registerJwt(app)

    app.get('/protected', { preHandler: [app.authenticate] }, async () => ({ ok: true }))
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/protected' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('authenticate accepts a valid token', async () => {
    app = Fastify({ logger: false })
    await registerJwt(app)

    app.get('/protected', { preHandler: [app.authenticate] }, async () => ({ ok: true }))
    await app.ready()

    const token = app.jwt.sign({ userId: 'user1', username: 'alice' })

    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
  })
})
