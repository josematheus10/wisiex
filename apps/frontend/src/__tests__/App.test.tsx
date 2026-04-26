import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockLogin = vi.fn()
const mockLogout = vi.fn()

vi.mock('../hooks/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../pages/LoginPage.js', () => ({
  LoginPage: ({ onLogin }: { onLogin: () => void }) => (
    <div data-testid="login-page">
      <button onClick={onLogin}>login</button>
    </div>
  ),
}))

vi.mock('../pages/TradingPage.js', () => ({
  TradingPage: ({ user, onLogout }: { user: { username: string }; onLogout: () => void }) => (
    <div data-testid="trading-page">
      <span>{user.username}</span>
      <button onClick={onLogout}>logout</button>
    </div>
  ),
}))

import { App } from '../App.js'
import { useAuth } from '../hooks/useAuth.js'

describe('App', () => {
  it('renders LoginPage when user and token are absent', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      login: mockLogin,
      logout: mockLogout,
      updateUser: vi.fn(),
    })

    render(<App />)

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.queryByTestId('trading-page')).not.toBeInTheDocument()
  })

  it('renders LoginPage when user is present but token is null', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', username: 'alice', btcBalance: '1', usdBalance: '1000', createdAt: '2024-01-01T00:00:00.000Z' },
      token: null,
      login: mockLogin,
      logout: mockLogout,
      updateUser: vi.fn(),
    })

    render(<App />)

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('renders LoginPage when token is present but user is null', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: 'tok',
      login: mockLogin,
      logout: mockLogout,
      updateUser: vi.fn(),
    })

    render(<App />)

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('renders TradingPage when both user and token are present', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', username: 'alice', btcBalance: '1', usdBalance: '1000', createdAt: '2024-01-01T00:00:00.000Z' },
      token: 'tok',
      login: mockLogin,
      logout: mockLogout,
      updateUser: vi.fn(),
    })

    render(<App />)

    expect(screen.getByTestId('trading-page')).toBeInTheDocument()
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
  })

  it('passes onLogin to LoginPage', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      login: mockLogin,
      logout: mockLogout,
      updateUser: vi.fn(),
    })

    render(<App />)

    screen.getByRole('button', { name: 'login' }).click()
    expect(mockLogin).toHaveBeenCalled()
  })

  it('passes onLogout to TradingPage', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', username: 'alice', btcBalance: '1', usdBalance: '1000', createdAt: '2024-01-01T00:00:00.000Z' },
      token: 'tok',
      login: mockLogin,
      logout: mockLogout,
      updateUser: vi.fn(),
    })

    render(<App />)

    screen.getByRole('button', { name: 'logout' }).click()
    expect(mockLogout).toHaveBeenCalled()
  })
})
