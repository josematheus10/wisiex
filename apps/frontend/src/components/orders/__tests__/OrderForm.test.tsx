import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OrderForm } from '../OrderForm.js'
import type { Order } from '@wisiex/shared'

vi.mock('../../../services/api.js', () => ({
  apiCreateOrder: vi.fn(),
}))

import { apiCreateOrder } from '../../../services/api.js'

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

describe('OrderForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Buy BTC and Sell BTC toggle buttons', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    expect(screen.getByRole('button', { name: /buy btc/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sell btc/i })).toBeInTheDocument()
  })

  it('defaults to BUY side', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    expect(screen.getByRole('button', { name: /place buy order/i })).toBeInTheDocument()
  })

  it('switches to SELL side when Sell BTC is clicked', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /sell btc/i }))

    expect(screen.getByRole('button', { name: /place sell order/i })).toBeInTheDocument()
  })

  it('switches back to BUY side when Buy BTC is clicked while on SELL', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /sell btc/i }))
    fireEvent.click(screen.getByRole('button', { name: /buy btc/i }))

    expect(screen.getByRole('button', { name: /place buy order/i })).toBeInTheDocument()
  })

  it('prefills price and side from props', () => {
    render(<OrderForm token="tok" prefillPrice="50000" prefillSide="SELL" onOrderCreated={vi.fn()} />)

    const priceInput = screen.getByPlaceholderText('0.00')
    expect((priceInput as HTMLInputElement).value).toBe('50000')
    expect(screen.getByRole('button', { name: /place sell order/i })).toBeInTheDocument()
  })

  it('prefills amount from prefillAmount prop', () => {
    render(<OrderForm token="tok" prefillPrice="50000" prefillSide="BUY" prefillAmount="1.5" onOrderCreated={vi.fn()} />)

    const amountInput = screen.getByPlaceholderText('0.000000000')
    expect((amountInput as HTMLInputElement).value).toBe('1.5')
  })

  it('does not prefill when prefillPrice is empty', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    const priceInput = screen.getByPlaceholderText('0.00')
    expect((priceInput as HTMLInputElement).value).toBe('')
  })

  it('shows computed total when price and amount are entered', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '50000' } })
    fireEvent.change(screen.getByPlaceholderText('0.000000000'), { target: { value: '2' } })

    expect(screen.getByText('$100000.00')).toBeInTheDocument()
  })

  it('shows em dash as total when price or amount is empty', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    expect(screen.getByText('$—')).toBeInTheDocument()
  })

  it('submits order and calls onOrderCreated on success', async () => {
    vi.mocked(apiCreateOrder).mockResolvedValue({ order: mockOrder })
    const onOrderCreated = vi.fn()

    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={onOrderCreated} />)

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '50000' } })
    fireEvent.change(screen.getByPlaceholderText('0.000000000'), { target: { value: '1' } })
    fireEvent.submit(screen.getByRole('button', { name: /place buy order/i }))

    await waitFor(() => {
      expect(onOrderCreated).toHaveBeenCalledWith(mockOrder)
    })
  })

  it('shows error when order creation fails', async () => {
    vi.mocked(apiCreateOrder).mockRejectedValue(new Error('Insufficient balance'))

    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '50000' } })
    fireEvent.change(screen.getByPlaceholderText('0.000000000'), { target: { value: '1' } })
    fireEvent.submit(screen.getByRole('button', { name: /place buy order/i }))

    await waitFor(() => {
      expect(screen.getByText('Insufficient balance')).toBeInTheDocument()
    })
  })

  it('shows fallback error for non-Error thrown values', async () => {
    vi.mocked(apiCreateOrder).mockRejectedValue('unknown')

    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '50000' } })
    fireEvent.change(screen.getByPlaceholderText('0.000000000'), { target: { value: '1' } })
    fireEvent.submit(screen.getByRole('button', { name: /place buy order/i }))

    await waitFor(() => {
      expect(screen.getByText('Failed to place order')).toBeInTheDocument()
    })
  })

  it('clears amount after successful order', async () => {
    vi.mocked(apiCreateOrder).mockResolvedValue({ order: mockOrder })

    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    const amountInput = screen.getByPlaceholderText('0.000000000')
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '50000' } })
    fireEvent.change(amountInput, { target: { value: '1' } })
    fireEvent.submit(screen.getByRole('button', { name: /place buy order/i }))

    await waitFor(() => {
      expect((amountInput as HTMLInputElement).value).toBe('')
    })
  })

  it('shows "Invalid amount" error when negative value is entered', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('0.000000000'), { target: { value: '-0.01' } })

    expect(screen.getByText('Invalid amount')).toBeInTheDocument()
    expect((screen.getByPlaceholderText('0.000000000') as HTMLInputElement).value).toBe('')
  })

  it('truncates BTC amount to 9 decimal places on change', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    const amountInput = screen.getByPlaceholderText('0.000000000') as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: '0.123456789123' } })

    expect(amountInput.value).toBe('0.123456789')
  })

  it('formats BTC amount to 9 decimal places on blur', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    const amountInput = screen.getByPlaceholderText('0.000000000') as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: '1' } })
    fireEvent.blur(amountInput)

    expect(amountInput.value).toBe('1.000000000')
  })

  it('formats partial decimal to 9 places on blur', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    const amountInput = screen.getByPlaceholderText('0.000000000') as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: '0.123' } })
    fireEvent.blur(amountInput)

    expect(amountInput.value).toBe('0.123000000')
  })

  it('does not format on blur when amount is empty', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    const amountInput = screen.getByPlaceholderText('0.000000000') as HTMLInputElement
    fireEvent.blur(amountInput)

    expect(amountInput.value).toBe('')
  })

  it('blocks negative sign on keydown and sets default value', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    const amountInput = screen.getByPlaceholderText('0.000000000') as HTMLInputElement
    fireEvent.keyDown(amountInput, { key: '-' })

    expect(amountInput.value).toBe('0.000000000')
  })

  it('keeps existing value when negative keydown fires on non-empty field', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    const amountInput = screen.getByPlaceholderText('0.000000000') as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: '1.5' } })
    fireEvent.keyDown(amountInput, { key: '-' })

    expect(amountInput.value).toBe('1.5')
  })

  it('blocks paste of negative value and sets default value when field empty', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    const amountInput = screen.getByPlaceholderText('0.000000000') as HTMLInputElement
    fireEvent.paste(amountInput, { clipboardData: { getData: () => '-1.5' } })

    expect(amountInput.value).toBe('0.000000000')
  })

  it('keeps existing value when pasting negative on non-empty field', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    const amountInput = screen.getByPlaceholderText('0.000000000') as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: '2.0' } })
    fireEvent.paste(amountInput, { clipboardData: { getData: () => '-1.5' } })

    expect(amountInput.value).toBe('2.0')
  })

  it('shows "Amount must be greater than zero" when submitting zero amount', async () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '50000' } })
    fireEvent.change(screen.getByPlaceholderText('0.000000000'), { target: { value: '0.000000000' } })
    fireEvent.submit(screen.getByRole('button', { name: /place buy order/i }))

    await waitFor(() => {
      expect(screen.getByText('Amount must be greater than zero')).toBeInTheDocument()
    })
    expect(apiCreateOrder).not.toHaveBeenCalled()
  })

  it('shows "Amount must be greater than zero" when submitting empty amount', async () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '50000' } })
    fireEvent.submit(screen.getByRole('button', { name: /place buy order/i }))

    await waitFor(() => {
      expect(screen.getByText('Amount must be greater than zero')).toBeInTheDocument()
    })
    expect(apiCreateOrder).not.toHaveBeenCalled()
  })

  it('does not format on blur when amount is NaN', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    const amountInput = screen.getByPlaceholderText('0.000000000') as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: 'abc' } })
    fireEvent.blur(amountInput)

    expect(amountInput.value).toBe('abc')
  })

  it('allows non-minus keydown events on amount field', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    const amountInput = screen.getByPlaceholderText('0.000000000') as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: '1' } })
    fireEvent.keyDown(amountInput, { key: '5' })

    expect(amountInput.value).toBe('1')
  })

  it('does not block paste of positive value', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    const amountInput = screen.getByPlaceholderText('0.000000000') as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: '1.0' } })
    fireEvent.paste(amountInput, { clipboardData: { getData: () => '2.5' } })

    expect(amountInput.value).toBe('1.0')
  })

  it('clears validation error when valid amount is entered after negative', () => {
    render(<OrderForm token="tok" prefillPrice="" prefillSide="BUY" onOrderCreated={vi.fn()} />)

    const amountInput = screen.getByPlaceholderText('0.000000000')
    fireEvent.change(amountInput, { target: { value: '-1' } })
    expect(screen.getByText('Invalid amount')).toBeInTheDocument()

    fireEvent.change(amountInput, { target: { value: '1' } })
    expect(screen.queryByText('Invalid amount')).not.toBeInTheDocument()
  })
})
