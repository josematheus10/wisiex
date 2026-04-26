import { useEffect, useState } from 'react'
import type { MarketStats, Order, OrderBook, Trade, User } from '@wisiex/shared'
import {
  apiActiveOrders,
  apiOrderBook,
  apiOrderHistory,
  apiStats,
  apiTrades,
} from '../services/api.js'
import { useSocket } from '../hooks/useSocket.js'
import { StatsBar } from '../components/stats/StatsBar.js'
import { OrderBookPanel } from '../components/orderbook/OrderBookPanel.js'
import { GlobalMatches } from '../components/trades/GlobalMatches.js'
import { OrderForm } from '../components/orders/OrderForm.js'
import { ActiveOrders } from '../components/orders/ActiveOrders.js'
import { OrderHistory } from '../components/orders/OrderHistory.js'

interface Props {
  user: User
  token: string
  onLogout: () => void
}

export function TradingPage({ user, token, onLogout }: Props) {
  const [stats, setStats] = useState<MarketStats | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [orderBook, setOrderBook] = useState<OrderBook>({ bids: [], asks: [] })
  const [activeOrders, setActiveOrders] = useState<Order[]>([])
  const [history, setHistory] = useState<Order[]>([])
  const [balance, setBalance] = useState({ btc: user.btcBalance, usd: user.usdBalance })
  const [prefillPrice, setPrefillPrice] = useState<string>('')
  const [prefillSide, setPrefillSide] = useState<'BUY' | 'SELL'>('BUY')
  const [prefillAmount, setPrefillAmount] = useState<string>('')

  const socketRef = useSocket(token)

  useEffect(() => {
    void Promise.all([
      apiStats().then((r) => setStats(r.stats)),
      apiTrades().then((r) => setTrades(r.trades)),
      apiOrderBook().then((r) => setOrderBook(r.orderBook)),
      apiActiveOrders(token).then((r) => setActiveOrders(r.orders)),
      apiOrderHistory(token).then((r) => setHistory(r.orders)),
    ])
  }, [token])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    socket.on('trade', ({ trade }: { trade: Trade }) =>
      setTrades((prev) => [trade, ...prev].slice(0, 50)),
    )
    socket.on('orderbook', ({ orderBook: ob }: { orderBook: OrderBook }) => setOrderBook(ob))
    socket.on('stats', ({ stats: s }: { stats: MarketStats }) => setStats(s))
    socket.on('order:update', ({ order }: { order: Order }) => {
      setActiveOrders((prev) => {
        const filtered = prev.filter((o) => o.id !== order.id)
        if (order.status === 'PENDING' || order.status === 'PARTIAL') return [order, ...filtered]
        setHistory((h) => [order, ...h.filter((o) => o.id !== order.id)])
        return filtered
      })
    })
    socket.on('balance:update', ({ btcBalance, usdBalance }: { btcBalance: string; usdBalance: string }) => {
      setBalance({ btc: btcBalance, usd: usdBalance })
    })

    return () => {
      socket.off('trade')
      socket.off('orderbook')
      socket.off('stats')
      socket.off('order:update')
      socket.off('balance:update')
    }
  }, [socketRef])

  function handleOrderCreated(order: Order) {
    setActiveOrders((prev) => [order, ...prev])
  }

  function handleOrderCancelled(order: Order) {
    setActiveOrders((prev) => prev.filter((o) => o.id !== order.id))
    setHistory((prev) => [order, ...prev])
  }

  function handleBookClick(price: string, side: 'BUY' | 'SELL', amount: string) {
    setPrefillPrice(price)
    setPrefillSide(side)
    setPrefillAmount(amount)
  }

  return (
    <div className="bg-dark min-vh-100 text-light">
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-black px-3 py-2 border-bottom border-secondary">
        <span className="navbar-brand fw-bold text-warning mb-0">Wisiex</span>
        <div className="d-flex align-items-center gap-3">
          <span className="text-muted small">{user.username}</span>
          <button className="btn btn-sm btn-outline-secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* Stats bar */}
      {stats && <StatsBar stats={stats} balance={balance} />}

      {/* Main grid */}
      <div className="container-fluid p-3">
        <div className="row g-3">
          {/* Order book */}
          <div className="col-12 col-md-3">
            <OrderBookPanel orderBook={orderBook} onEntryClick={handleBookClick} />
          </div>

          {/* Center: forms + matches */}
          <div className="col-12 col-md-6">
            <div className="row g-3">
              <div className="col-12">
                <OrderForm
                  token={token}
                  prefillPrice={prefillPrice}
                  prefillSide={prefillSide}
                  prefillAmount={prefillAmount}
                  onOrderCreated={handleOrderCreated}
                />
              </div>
              <div className="col-12">
                <GlobalMatches trades={trades} />
              </div>
            </div>
          </div>

          {/* Right: my orders */}
          <div className="col-12 col-md-3">
            <div className="row g-3">
              <div className="col-12">
                <ActiveOrders
                  orders={activeOrders}
                  token={token}
                  onCancelled={handleOrderCancelled}
                />
              </div>
              <div className="col-12">
                <OrderHistory orders={history} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
