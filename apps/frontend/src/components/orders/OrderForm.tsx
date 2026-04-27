import { useState, useEffect, type FormEvent, type KeyboardEvent, type ClipboardEvent } from 'react'
import type { Order } from '@wisiex/shared'
import { apiCreateOrder } from '../../services/api.js'

interface Props {
  token: string
  prefillPrice: string
  prefillSide: 'BUY' | 'SELL'
  prefillAmount?: string
  onOrderCreated: (order: Order) => void
}

export function OrderForm({ token, prefillPrice, prefillSide, prefillAmount, onOrderCreated }: Props) {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (prefillPrice) {
      setPrice(prefillPrice)
      setSide(prefillSide)
    }
    if (prefillAmount) {
      setAmount(prefillAmount)
    }
  }, [prefillPrice, prefillSide, prefillAmount])

  const total = price && amount ? (Number(price) * Number(amount)).toFixed(2) : '—'

  function handleAmountChange(value: string) {
    if (value.includes('-')) {
      setError('Invalid amount')
      setAmount('')
      return
    }
    const parts = value.split('.')
    if (parts.length === 2 && parts[1].length > 9) {
      setAmount(`${parts[0]}.${parts[1].slice(0, 9)}`)
    } else {
      setAmount(value)
    }
    setError('')
  }

  function handleAmountBlur() {
    if (!amount) return
    const num = parseFloat(amount)
    if (!isNaN(num) && num >= 0) {
      setAmount(num.toFixed(9))
    }
  }

  function handleAmountKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === '-') {
      e.preventDefault()
      setAmount((prev) => prev || '0.000000000')
    }
  }

  function handleAmountPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text')
    if (pasted.includes('-')) {
      e.preventDefault()
      setAmount((prev) => prev || '0.000000000')
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be greater than zero')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { order } = await apiCreateOrder({ side, price, amount }, token)
      onOrderCreated(order)
      setAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card bg-dark border-secondary">
      <div className="card-header border-secondary py-2 d-flex gap-2">
        <button
          className={`btn btn-sm flex-fill ${side === 'BUY' ? 'btn-success' : 'btn-outline-success'}`}
          onClick={() => setSide('BUY')}
          type="button"
        >
          Buy BTC
        </button>
        <button
          className={`btn btn-sm flex-fill ${side === 'SELL' ? 'btn-danger' : 'btn-outline-danger'}`}
          onClick={() => setSide('SELL')}
          type="button"
        >
          Sell BTC
        </button>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small text-muted">Price (USD)</label>
            <input
              className="form-control form-control-sm bg-dark text-light border-secondary"
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label small text-muted">Amount (BTC)</label>
            <input
              className="form-control form-control-sm bg-dark text-light border-secondary"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              onBlur={handleAmountBlur}
              onKeyDown={handleAmountKeyDown}
              onPaste={handleAmountPaste}
              placeholder="0.000000000"
            />
          </div>
          <div className="d-flex justify-content-between mb-3 small text-muted">
            <span>Total</span>
            <span className="text-light">${total}</span>
          </div>
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className={`btn btn-sm w-100 fw-semibold ${side === 'BUY' ? 'btn-success' : 'btn-danger'}`}
          >
            {loading ? 'Placing…' : `Place ${side} Order`}
          </button>
        </form>
      </div>
    </div>
  )
}
