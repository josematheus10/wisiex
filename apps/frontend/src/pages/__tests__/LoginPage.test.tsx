import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LoginPage } from '../LoginPage.js'

describe('LoginPage', () => {
  it('renders the form with username input and submit button', () => {
    render(<LoginPage onLogin={vi.fn()} />)

    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('calls onLogin with trimmed username when form is submitted', async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined)
    render(<LoginPage onLogin={onLogin} />)

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: '  alice  ' } })
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }))

    await vi.waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith('alice')
    })
  })

  it('shows loading state while submitting', async () => {
    let resolveLogin!: () => void
    const onLogin = vi.fn().mockReturnValue(new Promise<void>((res) => { resolveLogin = res }))
    render(<LoginPage onLogin={onLogin} />)

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } })
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()

    await vi.waitFor(() => {
      resolveLogin()
      return Promise.resolve()
    })
  })

  it('shows error message when login fails', async () => {
    const onLogin = vi.fn().mockRejectedValue(new Error('User not found'))
    render(<LoginPage onLogin={onLogin} />)

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } })
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }))

    await vi.waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument()
    })
  })

  it('shows generic error for non-Error thrown values', async () => {
    const onLogin = vi.fn().mockRejectedValue('string error')
    render(<LoginPage onLogin={onLogin} />)

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } })
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }))

    await vi.waitFor(() => {
      expect(screen.getByText('Login failed')).toBeInTheDocument()
    })
  })
})
