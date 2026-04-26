import { useState } from 'react'
import type { User } from '@wisiex/shared'
import { apiLogin } from '../services/api.js'

const TOKEN_KEY = 'wisiex_token'
const USER_KEY = 'wisiex_user'

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  })

  async function login(username: string) {
    const response = await apiLogin(username)
    localStorage.setItem(TOKEN_KEY, response.token)
    localStorage.setItem(USER_KEY, JSON.stringify(response.user))
    setToken(response.token)
    setUser(response.user)
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  function updateUser(updated: Partial<User>) {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...updated }
      localStorage.setItem(USER_KEY, JSON.stringify(next))
      return next
    })
  }

  return { user, token, login, logout, updateUser }
}
