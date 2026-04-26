import { describe, it, expect, vi } from 'vitest'

vi.mock('../cors.js', () => ({ registerCors: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../jwt.js', () => ({ registerJwt: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../prisma.js', () => ({ registerPrisma: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../redis.js', () => ({ registerRedis: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../socket.js', () => ({ registerSocket: vi.fn().mockResolvedValue(undefined) }))

import { registerPlugins } from '../index.js'
import { registerCors } from '../cors.js'
import { registerJwt } from '../jwt.js'
import { registerPrisma } from '../prisma.js'
import { registerRedis } from '../redis.js'
import { registerSocket } from '../socket.js'

describe('registerPlugins', () => {
  it('registers all plugins', async () => {
    const mockApp = {} as any
    await registerPlugins(mockApp)

    expect(registerCors).toHaveBeenCalledWith(mockApp)
    expect(registerJwt).toHaveBeenCalledWith(mockApp)
    expect(registerPrisma).toHaveBeenCalledWith(mockApp)
    expect(registerRedis).toHaveBeenCalledWith(mockApp)
    expect(registerSocket).toHaveBeenCalledWith(mockApp)
  })
})
