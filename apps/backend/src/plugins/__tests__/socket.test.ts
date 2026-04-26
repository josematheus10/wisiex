import { describe, it, expect, vi, afterEach } from 'vitest'
import Fastify from 'fastify'

const mockOn = vi.hoisted(() => vi.fn())
const mockClose = vi.hoisted(() => vi.fn().mockImplementation((cb: () => void) => cb()))
const mockServerOptions = vi.hoisted(() => ({ current: null as any }))

vi.mock('socket.io', () => ({
  Server: class MockServer {
    constructor(_server: unknown, options: unknown) {
      mockServerOptions.current = options
    }

    on = mockOn
    close = mockClose
  },
}))

import { registerSocket } from '../socket.js'

describe('registerSocket', () => {
  let app: ReturnType<typeof Fastify>

  afterEach(async () => {
    vi.clearAllMocks()
    mockServerOptions.current = null
    await app.close()
  })

  async function buildApp() {
    app = Fastify({ logger: false })
    const { default: jwt } = await import('@fastify/jwt')
    await app.register(jwt, { secret: 'test' })
    await registerSocket(app)
    await app.ready()
    return app
  }

  it('decorates app with io instance', async () => {
    mockOn.mockImplementation(() => {})
    await buildApp()
    expect((app as any).io).toBeDefined()
  })

  it('allows loopback origins in socket cors during development', async () => {
    mockOn.mockImplementation(() => {})
    await buildApp()

    const corsOptions = mockServerOptions.current?.cors
    expect(corsOptions).toBeDefined()

    const allowed = await new Promise<boolean>((resolve) => {
      corsOptions.origin('http://127.0.0.1:4173', (_error: Error | null, allow: boolean) => resolve(allow))
    })

    expect(allowed).toBe(true)
  })

  it('handles socket connection with auth event', async () => {
    let connectionHandler: ((socket: any) => void) | null = null
    mockOn.mockImplementation((event: string, handler: any) => {
      if (event === 'connection') connectionHandler = handler
    })

    await buildApp()

    const mockSocket = { id: 'socket1', on: vi.fn(), join: vi.fn(), emit: vi.fn() }
    connectionHandler!(mockSocket)

    expect(mockSocket.on).toHaveBeenCalledWith('auth', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function))

    const authHandler = mockSocket.on.mock.calls.find((c: any[]) => c[0] === 'auth')![1]
    const token = app.jwt.sign({ userId: 'user1' })
    await authHandler(token)
    expect(mockSocket.join).toHaveBeenCalledWith('user:user1')
    expect(mockSocket.emit).toHaveBeenCalledWith('auth:ok')
  })

  it('handles invalid token in auth event', async () => {
    let connectionHandler: ((socket: any) => void) | null = null
    mockOn.mockImplementation((event: string, handler: any) => {
      if (event === 'connection') connectionHandler = handler
    })

    await buildApp()

    const mockSocket = { id: 'socket1', on: vi.fn(), join: vi.fn(), emit: vi.fn() }
    connectionHandler!(mockSocket)

    const authHandler = mockSocket.on.mock.calls.find((c: any[]) => c[0] === 'auth')![1]
    await authHandler('invalid-token')
    expect(mockSocket.emit).toHaveBeenCalledWith('auth:error', 'Invalid token')
  })

  it('handles disconnect event', async () => {
    let connectionHandler: ((socket: any) => void) | null = null
    mockOn.mockImplementation((event: string, handler: any) => {
      if (event === 'connection') connectionHandler = handler
    })

    await buildApp()

    const mockSocket = { id: 'socket1', on: vi.fn(), join: vi.fn(), emit: vi.fn() }
    connectionHandler!(mockSocket)

    const disconnectHandler = mockSocket.on.mock.calls.find((c: any[]) => c[0] === 'disconnect')![1]
    disconnectHandler()
  })

  it('closes io on app close', async () => {
    mockOn.mockImplementation(() => {})
    await buildApp()
    await app.close()
    expect(mockClose).toHaveBeenCalled()
  })
})
