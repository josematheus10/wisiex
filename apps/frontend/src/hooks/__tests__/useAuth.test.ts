import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../../services/api.js', () => ({
  apiLogin: vi.fn(),
}))

import { useAuth } from '../useAuth.js'
import { apiLogin } from '../../services/api.js'

const mockUser = {
  id: 'u1',
  username: 'alice',
  btcBalance: '100',
  usdBalance: '100000',
  createdAt: '2024-01-01T00:00:00.000Z',
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('initializes with null user and token when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
  })

  it('initializes from localStorage when values exist', () => {
    localStorage.setItem('wisiex_token', 'existing-token')
    localStorage.setItem('wisiex_user', JSON.stringify(mockUser))

    const { result } = renderHook(() => useAuth())

    expect(result.current.token).toBe('existing-token')
    expect(result.current.user?.username).toBe('alice')
  })

  it('login calls apiLogin and stores token/user in localStorage', async () => {
    vi.mocked(apiLogin).mockResolvedValue({ token: 'new-token', user: mockUser })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login('alice')
    })

    expect(result.current.token).toBe('new-token')
    expect(result.current.user?.username).toBe('alice')
    expect(localStorage.getItem('wisiex_token')).toBe('new-token')
    expect(JSON.parse(localStorage.getItem('wisiex_user')!).username).toBe('alice')
  })

  it('logout clears token, user, and localStorage', async () => {
    vi.mocked(apiLogin).mockResolvedValue({ token: 'tok', user: mockUser })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login('alice')
    })

    act(() => {
      result.current.logout()
    })

    expect(result.current.token).toBeNull()
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem('wisiex_token')).toBeNull()
    expect(localStorage.getItem('wisiex_user')).toBeNull()
  })

  it('updateUser merges partial user data and updates localStorage', async () => {
    vi.mocked(apiLogin).mockResolvedValue({ token: 'tok', user: mockUser })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login('alice')
    })

    act(() => {
      result.current.updateUser({ btcBalance: '150' })
    })

    expect(result.current.user?.btcBalance).toBe('150')
    expect(result.current.user?.username).toBe('alice')
    const stored = JSON.parse(localStorage.getItem('wisiex_user')!)
    expect(stored.btcBalance).toBe('150')
  })

  it('updateUser does nothing when user is null', () => {
    const { result } = renderHook(() => useAuth())

    act(() => {
      result.current.updateUser({ btcBalance: '150' })
    })

    expect(result.current.user).toBeNull()
  })
})
