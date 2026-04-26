import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsBar } from '../StatsBar.js'
import type { MarketStats } from '@wisiex/shared'

const baseStats: MarketStats = {
  lastPrice: '50000',
  volume24hBtc: '10.5',
  volume24hUsd: '525000',
  high24h: '55000',
  low24h: '45000',
  priceChange24h: '2000',
}

const balance = { btc: '100', usd: '100000' }

describe('StatsBar', () => {
  it('renders last price', () => {
    render(<StatsBar stats={baseStats} balance={balance} />)
    expect(screen.getByText(/50,000/)).toBeInTheDocument()
  })

  it('renders 24h change with positive sign', () => {
    render(<StatsBar stats={baseStats} balance={balance} />)
    expect(screen.getByText('+2000.00')).toBeInTheDocument()
  })

  it('renders negative 24h change without plus sign', () => {
    render(<StatsBar stats={{ ...baseStats, priceChange24h: '-500' }} balance={balance} />)
    expect(screen.getByText('-500.00')).toBeInTheDocument()
  })

  it('renders em dash when lastPrice is null', () => {
    render(<StatsBar stats={{ ...baseStats, lastPrice: null }} balance={balance} />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('renders em dash when priceChange24h is null', () => {
    render(<StatsBar stats={{ ...baseStats, priceChange24h: null }} balance={balance} />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('renders em dash when high24h is null', () => {
    render(<StatsBar stats={{ ...baseStats, high24h: null }} balance={balance} />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('renders em dash when low24h is null', () => {
    render(<StatsBar stats={{ ...baseStats, low24h: null }} balance={balance} />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('renders balances', () => {
    render(<StatsBar stats={baseStats} balance={balance} />)
    expect(screen.getByText('100.00000000 BTC')).toBeInTheDocument()
    expect(screen.getByText('$100,000')).toBeInTheDocument()
  })

  it('renders BTC and USD volumes', () => {
    render(<StatsBar stats={baseStats} balance={balance} />)
    expect(screen.getByText('10.5000')).toBeInTheDocument()
    expect(screen.getByText('$525,000')).toBeInTheDocument()
  })
})
