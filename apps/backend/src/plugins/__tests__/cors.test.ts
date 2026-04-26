import { describe, it, expect, vi, afterEach } from 'vitest'
import Fastify from 'fastify'
import { registerCors } from '../cors.js'

describe('registerCors', () => {
  let app: ReturnType<typeof Fastify>

  afterEach(async () => {
    delete process.env['CORS_ORIGIN']
    await app.close()
  })

  it('registers cors plugin successfully', async () => {
    app = Fastify({ logger: false })
    await registerCors(app)
    app.get('/test', async () => ({ ok: true }))
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { Origin: 'http://localhost:5173' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })

  it('uses CORS_ORIGIN env variable when set', async () => {
    process.env['CORS_ORIGIN'] = 'http://myapp.com'
    app = Fastify({ logger: false })
    await registerCors(app)
    app.get('/test', async () => ({ ok: true }))
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { Origin: 'http://myapp.com' },
    })
    expect(res.headers['access-control-allow-origin']).toBe('http://myapp.com')
  })

  it('allows loopback origins during development', async () => {
    app = Fastify({ logger: false })
    await registerCors(app)
    app.get('/test', async () => ({ ok: true }))
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { Origin: 'http://127.0.0.1:4173' },
    })

    expect(res.headers['access-control-allow-origin']).toBe('http://127.0.0.1:4173')
  })
})
