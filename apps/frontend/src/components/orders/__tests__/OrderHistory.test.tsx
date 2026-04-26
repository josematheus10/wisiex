import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderHistory } from '../OrderHistory.js'
import type { Order } from '@wisiex/shared'

const orders: Order[] = [
  {
    id: 'o1',
    userId: 'u1',
    side: 'BUY',
    price: '50000',
    amount: '1',
    filled: '1',
    remaining: '0',
    status: 'COMPLETED',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T01:00:00.000Z',
  },
  {
    id: 'o2',
    userId: 'u1',
    side: 'SELL',
    price: '49000',
    amount: '0.5',
    filled: '0',
    remaining: '0.5',
    status: 'CANCELLED',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T01:00:00.000Z',
  },
]

describe('OrderHistory', () => {
  it('renders My Order History header', () => {
    render(<OrderHistory orders={[]} />)
    expect(screen.getByText('My Order History')).toBeInTheDocument()
  })

  it('shows "No history yet" when orders list is empty', () => {
    render(<OrderHistory orders={[]} />)
    expect(screen.getByText('No history yet')).toBeInTheDocument()
  })

  it('renders order rows', () => {
    render(<OrderHistory orders={orders} />)
    expect(screen.getAllByText('BUY')[0]).toBeInTheDocument()
    expect(screen.getAllByText('SELL')[0]).toBeInTheDocument()
    expect(screen.getByText('50,000')).toBeInTheDocument()
    expect(screen.getByText('49,000')).toBeInTheDocument()
  })

  it('renders COMPLETED badge with success color', () => {
    render(<OrderHistory orders={orders} />)
    const badge = screen.getByText('COMPLETED')
    expect(badge).toHaveClass('bg-success')
  })

  it('renders CANCELLED badge with secondary color', () => {
    render(<OrderHistory orders={orders} />)
    const badge = screen.getByText('CANCELLED')
    expect(badge).toHaveClass('bg-secondary')
  })
})
