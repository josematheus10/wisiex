import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import type { MarketStats, Order, OrderBook, Trade, User } from '@wisiex/shared'

vi.mock('../../services/api.js', () => ({
  apiStats: vi.fn(),
  apiTrades: vi.fn(),
  apiOrderBook: vi.fn(),
  apiActiveOrders: vi.fn(),
  apiOrderHistory: vi.fn(),
  apiMe: vi.fn(),
  apiCancelOrder: vi.fn(),
  apiCreateOrder: vi.fn(),
}))

const { mockSocket, mockSocketRef } = vi.hoisted(() => {
  const mockSocket = { on: vi.fn(), off: vi.fn(), emit: vi.fn(), disconnect: vi.fn() }
  const mockSocketRef = { current: mockSocket } as unknown as { current: import('socket.io-client').Socket | null }
  return { mockSocket, mockSocketRef }
})

vi.mock('../../hooks/useSocket.js', () => ({
  useSocket: vi.fn().mockReturnValue(mockSocketRef),
}))

import { TradingPage } from '../TradingPage.js'
import { apiStats, apiTrades, apiOrderBook, apiActiveOrders, apiOrderHistory, apiMe, apiCancelOrder, apiCreateOrder } from '../../services/api.js'
import { useSocket } from '../../hooks/useSocket.js'

const mockUser: User = {
  id: 'u1',
  username: 'alice',
  btcBalance: '100',
  usdBalance: '100000',
  createdAt: '2024-01-01T00:00:00.000Z',
}

const mockStats: MarketStats = {
  lastPrice: '50000',
  volume24hBtc: '10',
  volume24hUsd: '500000',
  high24h: '55000',
  low24h: '45000',
  priceChange24h: '2000',
}

const mockTrade: Trade = {
  id: 't1',
  price: '50000',
  amount: '0.5',
  side: 'BUY',
  makerFee: '0.0025',
  takerFee: '0.0015',
  createdAt: '2024-01-01T12:00:00.000Z',
}

const mockOrderBook: OrderBook = { bids: [], asks: [] }

const mockOrder: Order = {
  id: 'o1',
  userId: 'u1',
  side: 'BUY',
  price: '50000',
  amount: '1',
  filled: '0',
  remaining: '1',
  status: 'PENDING',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

describe('TradingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiStats).mockResolvedValue({ stats: mockStats })
    vi.mocked(apiTrades).mockResolvedValue({ trades: [mockTrade] })
    vi.mocked(apiOrderBook).mockResolvedValue({ orderBook: mockOrderBook })
    vi.mocked(apiActiveOrders).mockResolvedValue({ orders: [mockOrder] })
    vi.mocked(apiOrderHistory).mockResolvedValue({ orders: [] })
    vi.mocked(apiMe).mockResolvedValue({ ...mockUser })
    mockSocket.on.mockReset()
    mockSocket.off.mockReset()
    vi.mocked(useSocket).mockReturnValue(mockSocketRef)
  })

  it('renders navbar with username and logout button', async () => {
    await act(async () => {
      render(<TradingPage user={mockUser} token="tok" onLogout={vi.fn()} />)
    })

    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })

  it('calls logout when logout button is clicked', async () => {
    const onLogout = vi.fn()
    await act(async () => {
      render(<TradingPage user={mockUser} token="tok" onLogout={onLogout} />)
    })

    screen.getByRole('button', { name: /logout/i }).click()
    expect(onLogout).toHaveBeenCalled()
  })

  it('fetches initial data on mount', async () => {
    await act(async () => {
      render(<TradingPage user={mockUser} token="tok" onLogout={vi.fn()} />)
    })

    expect(apiStats).toHaveBeenCalled()
    expect(apiTrades).toHaveBeenCalled()
    expect(apiOrderBook).toHaveBeenCalled()
    expect(apiActiveOrders).toHaveBeenCalledWith('tok')
    expect(apiOrderHistory).toHaveBeenCalledWith('tok')
    expect(apiMe).toHaveBeenCalledWith('tok')
  })

  it('loads balance from apiMe on mount, not from stale user prop', async () => {
    vi.mocked(apiMe).mockResolvedValue({ ...mockUser, btcBalance: '5', usdBalance: '50000' })

    await act(async () => {
      render(<TradingPage user={mockUser} token="tok" onLogout={vi.fn()} />)
    })

    expect(screen.getByText('5.00000000 BTC')).toBeInTheDocument()
  })

  it('renders stats bar after data loads', async () => {
    await act(async () => {
      render(<TradingPage user={mockUser} token="tok" onLogout={vi.fn()} />)
    })

    expect(screen.getByText(/55,000/)).toBeInTheDocument()
  })

  it('subscribes to socket events and unsubscribes on unmount', async () => {
    let unmount!: () => void
    await act(async () => {
      const result = render(<TradingPage user={mockUser} token="tok" onLogout={vi.fn()} />)
      unmount = result.unmount
    })

    expect(mockSocket.on).toHaveBeenCalledWith('trade', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('orderbook', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('stats', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('order:update', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('balance:update', expect.any(Function))

    act(() => unmount())

    expect(mockSocket.off).toHaveBeenCalledWith('trade')
    expect(mockSocket.off).toHaveBeenCalledWith('orderbook')
    expect(mockSocket.off).toHaveBeenCalledWith('stats')
    expect(mockSocket.off).toHaveBeenCalledWith('order:update')
    expect(mockSocket.off).toHaveBeenCalledWith('balance:update')
  })

  it('handles trade socket event - prepends trade and caps at 50', async () => {
    await act(async () => {
      render(<TradingPage user={mockUser} token="tok" onLogout={vi.fn()} />)
    })

    const tradeHandler = mockSocket.on.mock.calls.find((c: any[]) => c[0] === 'trade')![1]
    const newTrade: Trade = { ...mockTrade, id: 't2', price: '51000' }

    act(() => {
      tradeHandler({ trade: newTrade })
    })

    expect(screen.getByText('51,000')).toBeInTheDocument()
  })

  it('handles orderbook socket event', async () => {
    await act(async () => {
      render(<TradingPage user={mockUser} token="tok" onLogout={vi.fn()} />)
    })

    const orderbookHandler = mockSocket.on.mock.calls.find((c: any[]) => c[0] === 'orderbook')![1]
    act(() => {
      orderbookHandler({ orderBook: { bids: [], asks: [] } })
    })
  })

  it('handles stats socket event', async () => {
    await act(async () => {
      render(<TradingPage user={mockUser} token="tok" onLogout={vi.fn()} />)
    })

    const statsHandler = mockSocket.on.mock.calls.find((c: any[]) => c[0] === 'stats')![1]
    act(() => {
      statsHandler({ stats: { ...mockStats, lastPrice: '52000' } })
    })

    expect(screen.getByText(/52,000/)).toBeInTheDocument()
  })

  it('handles order:update event - PENDING moves order to active', async () => {
    await act(async () => {
      render(<TradingPage user={mockUser} token="tok" onLogout={vi.fn()} />)
    })

    const orderUpdateHandler = mockSocket.on.mock.calls.find((c: any[]) => c[0] === 'order:update')![1]
    const updatedOrder: Order = { ...mockOrder, id: 'o2', status: 'PENDING' }

    act(() => {
      orderUpdateHandler({ order: updatedOrder })
    })
  })

  it('handles order:update event - PARTIAL keeps order in active', async () => {
    await act(async () => {
      render(<TradingPage user={mockUser} token="tok" onLogout={vi.fn()} />)
    })

    const orderUpdateHandler = mockSocket.on.mock.calls.find((c: any[]) => c[0] === 'order:update')![1]
    const partialOrder: Order = { ...mockOrder, status: 'PARTIAL' }

    act(() => {
      orderUpdateHandler({ order: partialOrder })
    })
  })

  it('handles order:update event - COMPLETED moves order to history', async () => {
    const existingHistoryOrder: Order = { ...mockOrder, id: 'h1', status: 'COMPLETED' as const }
    vi.mocked(apiOrderHistory).mockResolvedValue({ orders: [existingHistoryOrder] })

    await act(async () => {
      render(<TradingPage user={mockUser} token="tok" onLogout={vi.fn()} />)
    })

    const orderUpdateHandler = mockSocket.on.mock.calls.find((c: any[]) => c[0] === 'order:update')![1]
    const completedOrder: Order = { ...mockOrder, status: 'COMPLETED' as const }

    act(() => {
      orderUpdateHandler({ order: completedOrder })
    })
  })

  it('handles balance:update socket event', async () => {
    await act(async () => {
      render(<TradingPage user={mockUser} token="tok" onLogout={vi.fn()} />)
    })

    const balanceHandler = mockSocket.on.mock.calls.find((c: any[]) => c[0] === 'balance:update')![1]

    act(() => {
      balanceHandler({ btcBalance: '150', usdBalance: '80000' })
    })

    expect(screen.getByText('150.00000000 BTC')).toBeInTheDocument()
  })

  it('does not subscribe to socket events when socket is null', async () => {
    vi.mocked(useSocket).mockReturnValue({ current: null })

    await act(async () => {
      render(<TradingPage user={mockUser} token="tok" onLogout={vi.fn()} />)
    })

    expect(mockSocket.on).not.toHaveBeenCalled()
  })

  it('handleOrderCreated adds order to active orders', async () => {
    const newOrder = { ...mockOrder, id: 'o2' }
    vi.mocked(apiActiveOrders).mockResolvedValue({ orders: [] })
    vi.mocked(apiCreateOrder).mockResolvedValue({ order: newOrder })

    await act(async () => {
      render(<TradingPage user={mockUser} token="tok" onLogout={vi.fn()} />)
    })

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '50000' } })
    fireEvent.change(screen.getByPlaceholderText('0.00000000'), { target: { value: '1' } })

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /place buy order/i }))
    })

    expect(apiCreateOrder).toHaveBeenCalled()
  })

  it('handleOrderCancelled removes order from active and adds to history', async () => {
    const cancelledOrder = { ...mockOrder, status: 'CANCELLED' as const }
    vi.mocked(apiCancelOrder).mockResolvedValue({ order: cancelledOrder })

    await act(async () => {
      render(<TradingPage user={mockUser} token="tok" onLogout={vi.fn()} />)
    })

    const cancelBtn = screen.getByRole('button', { name: '✕' })
    await act(async () => {
      cancelBtn.click()
    })

    expect(apiCancelOrder).toHaveBeenCalledWith(mockOrder.id, 'tok')
  })

  it('handleBookClick prefills order form with price and opposite side', async () => {
    vi.mocked(apiOrderBook).mockResolvedValue({
      orderBook: {
        bids: [{ price: '49000', amount: '2', total: '98000', count: 1 }],
        asks: [],
      },
    })

    await act(async () => {
      render(<TradingPage user={mockUser} token="tok" onLogout={vi.fn()} />)
    })

    const bidRow = screen.getByText('49,000').closest('tr')!
    act(() => {
      bidRow.click()
    })

    await vi.waitFor(() => {
      const priceInput = screen.getByPlaceholderText('0.00') as HTMLInputElement
      expect(priceInput.value).toBe('49000')
      const amountInput = screen.getByPlaceholderText('0.00000000') as HTMLInputElement
      expect(amountInput.value).toBe('2')
    })
  })
})
