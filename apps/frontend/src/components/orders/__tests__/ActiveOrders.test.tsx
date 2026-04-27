import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActiveOrders } from '../ActiveOrders.js'
import type { Order } from '@wisiex/shared'

vi.mock('../../../services/api.js', () => ({
  apiCancelOrder: vi.fn(),
}))

import { apiCancelOrder } from '../../../services/api.js'

const makeOrder = (id: string, side: 'BUY' | 'SELL'): Order => ({
  id,
  userId: 'u1',
  side,
  price: '50000',
  amount: '1',
  filled: '0',
  remaining: '1',
  status: 'PENDING',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
})

describe('ActiveOrders', () => {
  it('renders My Active Orders header', () => {
    render(<ActiveOrders orders={[]} token="tok" onCancelled={vi.fn()} />)
    expect(screen.getByText('My Active Orders')).toBeInTheDocument()
  })

  it('shows "No active orders" when list is empty', () => {
    render(<ActiveOrders orders={[]} token="tok" onCancelled={vi.fn()} />)
    expect(screen.getByText('No active orders')).toBeInTheDocument()
  })

  it('renders orders with side, price, and cancel button', () => {
    const orders = [makeOrder('o1', 'BUY'), makeOrder('o2', 'SELL')]
    render(<ActiveOrders orders={orders} token="tok" onCancelled={vi.fn()} />)

    expect(screen.getByText('BUY')).toBeInTheDocument()
    expect(screen.getByText('SELL')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '✕' })).toHaveLength(2)
  })

  it('calls apiCancelOrder and onCancelled when cancel is clicked', async () => {
    const cancelledOrder = { ...makeOrder('o1', 'BUY'), status: 'CANCELLED' as const }
    vi.mocked(apiCancelOrder).mockResolvedValue({ order: cancelledOrder })
    const onCancelled = vi.fn()

    render(<ActiveOrders orders={[makeOrder('o1', 'BUY')]} token="tok" onCancelled={onCancelled} />)

    fireEvent.click(screen.getByRole('button', { name: '✕' }))

    await vi.waitFor(() => {
      expect(apiCancelOrder).toHaveBeenCalledWith('o1', 'tok')
      expect(onCancelled).toHaveBeenCalledWith(cancelledOrder)
    })
  })

  it('silently moves already-executed order out of active when backend returns 400', async () => {
    vi.mocked(apiCancelOrder).mockRejectedValue(new Error('Order cannot be cancelled'))
    const onCancelled = vi.fn()
    const order = makeOrder('o1', 'BUY')

    render(<ActiveOrders orders={[order]} token="tok" onCancelled={onCancelled} />)

    fireEvent.click(screen.getByRole('button', { name: '✕' }))

    await vi.waitFor(() => {
      expect(onCancelled).toHaveBeenCalledWith({ ...order, status: 'COMPLETED' })
    })
  })

  it('shows alert when cancel fails with unexpected error', async () => {
    vi.mocked(apiCancelOrder).mockRejectedValue(new Error('Cancel failed'))
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(<ActiveOrders orders={[makeOrder('o1', 'BUY')]} token="tok" onCancelled={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '✕' }))

    await vi.waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Cancel failed')
    })
    alertSpy.mockRestore()
  })

  it('shows alert with fallback message when non-Error is thrown', async () => {
    vi.mocked(apiCancelOrder).mockRejectedValue('unknown error')
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(<ActiveOrders orders={[makeOrder('o1', 'BUY')]} token="tok" onCancelled={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '✕' }))

    await vi.waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Cancel failed')
    })
    alertSpy.mockRestore()
  })
})
