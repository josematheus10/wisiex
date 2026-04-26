import { useAuth } from './hooks/useAuth.js'
import { LoginPage } from './pages/LoginPage.js'
import { TradingPage } from './pages/TradingPage.js'

export function App() {
  const { user, token, login, logout } = useAuth()

  if (!user || !token) {
    return <LoginPage onLogin={login} />
  }

  return <TradingPage user={user} token={token} onLogout={logout} />
}
