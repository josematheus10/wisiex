import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GlobalMatches } from '../GlobalMatches.js'
import type { Trade } from '@wisiex/shared'

const trades: Trade[] = [
  {
    id: 't1',
    price: '50000',
    amount: '0.5',
    side: 'BUY',
    makerFee: '0.0025',
    takerFee: '0.0015',
    createdAt: '2024-01-01T12:00:00.000Z',
  },
  {
    id: 't2',
    price: '49000',
    amount: '1',
    side: 'SELL',
    makerFee: '0.005',
    takerFee: '0.003',
    createdAt: '2024-01-01T11:00:00.000Z',
  },
]

describe('GlobalMatches', () => {
  it('renders Global Matches header', () => {
    render(<GlobalMatches trades={[]} />)
    expect(screen.getByText('Global Matches')).toBeInTheDocument()
  })

  it('shows "No trades yet" when trades list is empty', () => {
    render(<GlobalMatches trades={[]} />)
    expect(screen.getByText('No trades yet')).toBeInTheDocument()
  })

  it('renders trade rows with price and amount', () => {
    render(<GlobalMatches trades={trades} />)
    expect(screen.getByText('50,000')).toBeInTheDocument()
    expect(screen.getByText('0.500000')).toBeInTheDocument()
    expect(screen.getByText('49,000')).toBeInTheDocument()
    expect(screen.getByText('1.000000')).toBeInTheDocument()
  })

  it('renders trade time in locale format', () => {
    render(<GlobalMatches trades={trades} />)
    const times = screen.getAllByText(/\d+:\d+/)
    expect(times.length).toBeGreaterThan(0)
  })
})
