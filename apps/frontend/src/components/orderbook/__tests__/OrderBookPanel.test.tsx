import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OrderBookPanel } from '../OrderBookPanel.js'
import type { OrderBook } from '@wisiex/shared'

const emptyBook: OrderBook = { bids: [], asks: [] }

const bookWithData: OrderBook = {
  bids: [
    { price: '49000', amount: '1.5', total: '73500', count: 3 },
    { price: '48000', amount: '0.5', total: '24000', count: 1 },
  ],
  asks: [
    { price: '51000', amount: '2', total: '102000', count: 4 },
  ],
}

describe('OrderBookPanel', () => {
  it('renders Order Book header', () => {
    render(<OrderBookPanel orderBook={emptyBook} onEntryClick={vi.fn()} />)
    expect(screen.getByText('Order Book')).toBeInTheDocument()
  })

  it('renders SPREAD row', () => {
    render(<OrderBookPanel orderBook={emptyBook} onEntryClick={vi.fn()} />)
    expect(screen.getByText('SPREAD')).toBeInTheDocument()
  })

  it('renders bid entries', () => {
    render(<OrderBookPanel orderBook={bookWithData} onEntryClick={vi.fn()} />)
    expect(screen.getByText('49,000')).toBeInTheDocument()
    expect(screen.getByText('48,000')).toBeInTheDocument()
  })

  it('renders ask entries (reversed)', () => {
    render(<OrderBookPanel orderBook={bookWithData} onEntryClick={vi.fn()} />)
    expect(screen.getByText('51,000')).toBeInTheDocument()
  })

  it('calls onEntryClick with opposite side when bid row is clicked (BUY -> SELL)', () => {
    const onEntryClick = vi.fn()
    render(<OrderBookPanel orderBook={bookWithData} onEntryClick={onEntryClick} />)

    fireEvent.click(screen.getByText('49,000').closest('tr')!)

    expect(onEntryClick).toHaveBeenCalledWith('49000', 'SELL')
  })

  it('calls onEntryClick with opposite side when ask row is clicked (SELL -> BUY)', () => {
    const onEntryClick = vi.fn()
    render(<OrderBookPanel orderBook={bookWithData} onEntryClick={onEntryClick} />)

    fireEvent.click(screen.getByText('51,000').closest('tr')!)

    expect(onEntryClick).toHaveBeenCalledWith('51000', 'BUY')
  })
})
