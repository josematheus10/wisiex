import { describe, it, expect } from 'vitest'
import { serializeOrder, serializeTrade } from '../serializers.js'

const d = (v: string) => ({ toString: () => v })

describe('serializeOrder', () => {
  const base = {
    id: 'o1',
    userId: 'u1',
    user: { username: 'alice' },
    side: 'BUY',
    price: d('50000'),
    amount: d('2'),
    filled: d('0.5'),
    status: 'PARTIAL',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T01:00:00.000Z'),
  }

  it('computes remaining correctly', () => {
    const result = serializeOrder(base)
    expect(result.remaining).toBe('1.5')
    expect(result.id).toBe('o1')
    expect(result.userId).toBe('u1')
    expect(result.username).toBe('alice')
    expect(result.side).toBe('BUY')
    expect(result.price).toBe('50000')
    expect(result.amount).toBe('2')
    expect(result.filled).toBe('0.5')
    expect(result.status).toBe('PARTIAL')
    expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z')
    expect(result.updatedAt).toBe('2024-01-01T01:00:00.000Z')
  })

  it('remaining is zero when fully filled', () => {
    const result = serializeOrder({ ...base, amount: d('1'), filled: d('1') })
    expect(result.remaining).toBe('0')
  })

  it('serializes SELL side', () => {
    const result = serializeOrder({ ...base, side: 'SELL' })
    expect(result.side).toBe('SELL')
  })

  it('serializes COMPLETED status', () => {
    const result = serializeOrder({ ...base, status: 'COMPLETED' })
    expect(result.status).toBe('COMPLETED')
  })
})

describe('serializeTrade', () => {
  const trade = {
    id: 't1',
    price: d('50000'),
    amount: d('0.5'),
    makerFee: d('0.0025'),
    takerFee: d('0.0015'),
    createdAt: new Date('2024-01-01T12:00:00.000Z'),
  }

  it('serializes trade correctly', () => {
    const result = serializeTrade(trade)
    expect(result).toEqual({
      id: 't1',
      price: '50000',
      amount: '0.5',
      makerFee: '0.0025',
      takerFee: '0.0015',
      createdAt: '2024-01-01T12:00:00.000Z',
    })
  })
})
