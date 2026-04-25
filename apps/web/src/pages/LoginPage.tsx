import { useState, type FormEvent } from 'react'

interface Props {
  onLogin: (username: string) => Promise<void>
}

export function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onLogin(username.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark">
      <div className="card bg-secondary-subtle p-4 shadow" style={{ width: 360 }}>
        <h2 className="mb-1 fw-bold text-center">Wisiex</h2>
        <p className="text-muted text-center mb-4">BTC/USD Exchange</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              id="username"
              className="form-control"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              minLength={3}
              maxLength={32}
              required
              autoFocus
            />
            <div className="form-text">New accounts are created automatically.</div>
          </div>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <button type="submit" className="btn btn-warning w-100 fw-semibold" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
