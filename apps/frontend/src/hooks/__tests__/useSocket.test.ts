import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const mockSocket = vi.hoisted(() => ({
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('socket.io-client', () => ({
  io: vi.fn().mockReturnValue(mockSocket),
}))

import { useSocket } from '../useSocket.js'
import { io } from 'socket.io-client'

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSocket.on.mockReset()
    mockSocket.emit.mockReset()
    mockSocket.disconnect.mockReset()
  })

  it('creates a socket connection on mount', () => {
    renderHook(() => useSocket('my-token'))

    expect(io).toHaveBeenCalledWith(expect.any(String), { autoConnect: true })
  })

  it('sets socketRef.current to the socket instance', () => {
    const { result } = renderHook(() => useSocket('my-token'))

    expect(result.current.current).toBe(mockSocket)
  })

  it('listens for connect and emits auth token when token is provided', () => {
    renderHook(() => useSocket('my-token'))

    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function))

    const connectHandler = mockSocket.on.mock.calls.find((c: any[]) => c[0] === 'connect')![1]
    connectHandler()

    expect(mockSocket.emit).toHaveBeenCalledWith('auth', 'my-token')
  })

  it('does not listen for connect when token is null', () => {
    renderHook(() => useSocket(null))

    const connectCall = mockSocket.on.mock.calls.find((c: any[]) => c[0] === 'connect')
    expect(connectCall).toBeUndefined()
  })

  it('disconnects socket on unmount', () => {
    const { unmount } = renderHook(() => useSocket('my-token'))

    unmount()

    expect(mockSocket.disconnect).toHaveBeenCalled()
  })

  it('reconnects when token changes', () => {
    const { rerender } = renderHook(
      ({ token }: { token: string | null }) => useSocket(token),
      { initialProps: { token: 'token-1' } },
    )

    rerender({ token: 'token-2' })

    expect(io).toHaveBeenCalledTimes(2)
  })
})
