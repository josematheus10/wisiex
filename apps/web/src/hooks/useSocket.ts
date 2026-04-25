import { useEffect, useRef, type RefObject } from 'react'
import { io, type Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001'

export function useSocket(token: string | null): RefObject<Socket | null> {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io(SOCKET_URL, { autoConnect: true })
    socketRef.current = socket

    if (token) {
      socket.on('connect', () => {
        socket.emit('auth', token)
      })
    }

    return () => {
      socket.disconnect()
    }
  }, [token])

  return socketRef
}
