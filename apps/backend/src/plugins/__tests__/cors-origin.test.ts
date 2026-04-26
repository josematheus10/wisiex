import { describe, it, expect, afterEach, vi } from 'vitest'
import { isCorsOriginAllowed, corsOriginResolver } from '../cors-origin.js'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isCorsOriginAllowed', () => {
  it('returns true when origin is undefined', () => {
    expect(isCorsOriginAllowed(undefined)).toBe(true)
  })

  it('returns true when origin is in CORS_ORIGIN env var', () => {
    vi.stubEnv('CORS_ORIGIN', 'https://example.com,https://other.com')
    expect(isCorsOriginAllowed('https://example.com')).toBe(true)
  })

  it('returns true for loopback origin in non-production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('CORS_ORIGIN', '')
    expect(isCorsOriginAllowed('http://localhost:3000')).toBe(true)
  })

  it('returns true for 127.0.0.1 loopback in non-production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('CORS_ORIGIN', '')
    expect(isCorsOriginAllowed('http://127.0.0.1:5173')).toBe(true)
  })

  it('returns false for loopback origin in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CORS_ORIGIN', '')
    expect(isCorsOriginAllowed('http://localhost:3000')).toBe(false)
  })

  it('returns false for unknown origin not in configured list', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CORS_ORIGIN', 'https://allowed.com')
    expect(isCorsOriginAllowed('https://unknown.com')).toBe(false)
  })

  it('returns false for invalid-URL origin in production (catch path)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CORS_ORIGIN', '')
    expect(isCorsOriginAllowed('not-a-valid-url')).toBe(false)
  })

  it('returns false for invalid-URL origin in development (catch path covers line 19)', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('CORS_ORIGIN', '')
    expect(isCorsOriginAllowed('not-a-valid-url')).toBe(false)
  })
})

describe('corsOriginResolver', () => {
  it('calls callback with (null, true) for allowed origin', () => {
    const cb = vi.fn()
    corsOriginResolver(undefined, cb)
    expect(cb).toHaveBeenCalledWith(null, true)
  })

  it('calls callback with (null, false) for disallowed origin', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CORS_ORIGIN', '')
    const cb = vi.fn()
    corsOriginResolver('https://blocked.com', cb)
    expect(cb).toHaveBeenCalledWith(null, false)
  })
})
