import { describe, it, expect, vi } from 'vitest'

const mockApp = vi.hoisted(() => ({
  decorate: vi.fn(),
  register: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  addHook: vi.fn(),
  log: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('fastify', () => ({
  default: vi.fn().mockReturnValue(mockApp),
}))

vi.mock('../plugins/index.js', () => ({ registerPlugins: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../routes/index.js', () => ({ registerRoutes: vi.fn().mockResolvedValue(undefined) }))

import { buildApp } from '../app.js'
import { registerPlugins } from '../plugins/index.js'
import { registerRoutes } from '../routes/index.js'

describe('buildApp', () => {
  it('calls registerPlugins and registerRoutes with the app', async () => {
    const app = await buildApp()

    expect(registerPlugins).toHaveBeenCalledWith(mockApp)
    expect(registerRoutes).toHaveBeenCalledWith(mockApp)
    expect(app).toBe(mockApp)
  })
})
