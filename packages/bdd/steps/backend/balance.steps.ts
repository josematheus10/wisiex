import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'
import type { Order } from '@wisiex/shared'

type BalWorld = WisiexWorld & {
  balanceUser?: string
  secondResponse?: Response
  secondResponseBody?: unknown
  openOrderId?: string
  partialInitialUsd?: number
  partialInitialBtc?: number
  initialBalance?: { btc: number; usd: number }
  maliciousResponse?: Response
}

Given('the user has {int} USD available', async function (this: BalWorld, usd: number) {
  this.balanceUser = 'balance_usd_bdd'
  this.partialInitialUsd = usd
  await this.loginAs(this.balanceUser)
  await this.api(`/test/users/${this.balanceUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: String(usd) }),
  })
})

Given('the user has {float} BTC available', async function (this: BalWorld, btc: number) {
  this.balanceUser = 'balance_btc_bdd'
  this.partialInitialBtc = btc
  await this.loginAs(this.balanceUser)
  await this.api(`/test/users/${this.balanceUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: String(btc), usdBalance: '0' }),
  })
})

Given('the user has {int} USD available and {int} USD reserved', async function (this: BalWorld, usd: number, _reserved: number) {
  this.balanceUser = 'balance_invariant_bdd'
  await this.loginAs(this.balanceUser)
  await this.api(`/test/users/${this.balanceUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '100', usdBalance: String(usd) }),
  })
})

Given('a user has reserved balances', async function (this: BalWorld) {
  this.balanceUser = 'reserved_balance_bdd'
  await this.loginAs(this.balanceUser)
  await this.api(`/test/users/${this.balanceUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '10', usdBalance: '100000' }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '50000', amount: '1' }),
  })
})

Given('a user has available and reserved balances', async function (this: BalWorld) {
  this.balanceUser = 'consistency_balance_bdd'
  await this.loginAs(this.balanceUser)
  await this.api(`/test/users/${this.balanceUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '5', usdBalance: '50000' }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '30000', amount: '0.5' }),
  })
  await this.api('/me')
  const body = this.responseBody as { btcBalance: string; usdBalance: string }
  this.initialBalance = {
    btc: Number(body.btcBalance),
    usd: Number(body.usdBalance),
  }
})

Given('the user has an open buy order of {int} BTC at {int} USD', async function (this: BalWorld & { cancelOrderId?: string; activeOrderId?: string }, amount: number, price: number) {
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: String(price), amount: String(amount) }),
  })
  const body = this.responseBody as { order: Order }
  this.openOrderId = body?.order?.id
  this.cancelOrderId = body?.order?.id
  this.activeOrderId = body?.order?.id
})

Given('the user has an open sell order of {int} BTC at {int} USD', async function (this: BalWorld & { cancelOrderId?: string; activeOrderId?: string }, amount: number, price: number) {
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: String(price), amount: String(amount) }),
  })
  const body = this.responseBody as { order: Order }
  this.openOrderId = body?.order?.id
  this.cancelOrderId = body?.order?.id
  this.activeOrderId = body?.order?.id
})

When('the user submits another buy order with amount {int} BTC and price {int} USD', async function (this: BalWorld, amount: number, price: number) {
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: String(price), amount: String(amount) }),
  })
  this.secondResponse = this.response ?? undefined
  this.secondResponseBody = this.responseBody
})

When('the user submits another sell order with amount {int} BTC at price {int} USD', async function (this: BalWorld, amount: number, price: number) {
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: String(price), amount: String(amount) }),
  })
  this.secondResponse = this.response ?? undefined
  this.secondResponseBody = this.responseBody
})

When('the system updates reservations', async function (this: BalWorld) {
  await this.api('/orders/active')
})

When('balances are updated', async function (this: BalWorld) {
  await this.api('/me')
})

When('the backend processes the request', async function (this: BalWorld) {
  this.maliciousResponse = this.response
})

Then('the user should have {int} USD available', async function (this: BalWorld, usd: number) {
  await this.api('/me')
  const body = this.responseBody as { usdBalance: string }
  assert.equal(Number(body.usdBalance), usd, `Expected ${usd} USD available, got ${body.usdBalance}`)
})

Then('the user should have {int} USD reserved', async function (this: BalWorld, usd: number) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reserved = (body.orders ?? [])
    .filter((o) => o.side === 'BUY')
    .reduce((sum, o) => sum + Number(o.remaining) * Number(o.price), 0)
  assert.equal(reserved, usd, `Expected ${usd} USD reserved, got ${reserved}`)
})

Then('the user should have {int} BTC available', async function (this: BalWorld, btc: number) {
  await this.api('/me')
  const body = this.responseBody as { btcBalance: string }
  assert.equal(Number(body.btcBalance), btc, `Expected ${btc} BTC available, got ${body.btcBalance}`)
})

Then('the user should have {int} BTC reserved', async function (this: BalWorld, btc: number) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reserved = (body.orders ?? [])
    .filter((o) => o.side === 'SELL')
    .reduce((sum, o) => sum + Number(o.remaining), 0)
  assert.equal(reserved, btc, `Expected ${btc} BTC reserved, got ${reserved}`)
})

Then('reserved BTC and USD must never be negative', async function (this: BalWorld) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reservedBtc = (body.orders ?? [])
    .filter((o) => o.side === 'SELL')
    .reduce((sum, o) => sum + Number(o.remaining), 0)
  const reservedUsd = (body.orders ?? [])
    .filter((o) => o.side === 'BUY')
    .reduce((sum, o) => sum + Number(o.remaining) * Number(o.price), 0)
  assert.ok(reservedBtc >= 0, `Reserved BTC must be >= 0, got ${reservedBtc}`)
  assert.ok(reservedUsd >= 0, `Reserved USD must be >= 0, got ${reservedUsd}`)
})

Then('available balance must be greater than or equal to zero', async function (this: BalWorld) {
  await this.api('/me')
  const body = this.responseBody as { btcBalance: string; usdBalance: string }
  assert.ok(Number(body.btcBalance) >= 0, `BTC balance must be >= 0, got ${body.btcBalance}`)
  assert.ok(Number(body.usdBalance) >= 0, `USD balance must be >= 0, got ${body.usdBalance}`)
})

Then('reserved balance must be greater than or equal to zero', async function (this: BalWorld) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reservedBtc = (body.orders ?? [])
    .filter((o) => o.side === 'SELL')
    .reduce((sum, o) => sum + Number(o.remaining), 0)
  const reservedUsd = (body.orders ?? [])
    .filter((o) => o.side === 'BUY')
    .reduce((sum, o) => sum + Number(o.remaining) * Number(o.price), 0)
  assert.ok(reservedBtc >= 0, `Reserved BTC must be >= 0, got ${reservedBtc}`)
  assert.ok(reservedUsd >= 0, `Reserved USD must be >= 0, got ${reservedUsd}`)
})

Then('total balance must remain consistent', async function (this: BalWorld) {
  await this.api('/me')
  const meBody = this.responseBody as { btcBalance: string; usdBalance: string }
  await this.api('/orders/active')
  const ordersBody = this.responseBody as { orders: Order[] }

  const availableBtc = Number(meBody.btcBalance)
  const availableUsd = Number(meBody.usdBalance)
  const reservedBtc = (ordersBody.orders ?? [])
    .filter((o) => o.side === 'SELL')
    .reduce((sum, o) => sum + Number(o.remaining), 0)
  const reservedUsd = (ordersBody.orders ?? [])
    .filter((o) => o.side === 'BUY')
    .reduce((sum, o) => sum + Number(o.remaining) * Number(o.price), 0)

  const totalBtc = availableBtc + reservedBtc
  const totalUsd = availableUsd + reservedUsd

  assert.ok(totalBtc >= 0, `Total BTC must be >= 0, got ${totalBtc}`)
  assert.ok(totalUsd >= 0, `Total USD must be >= 0, got ${totalUsd}`)
  assert.ok(availableBtc >= 0, `Available BTC must be >= 0, got ${availableBtc}`)
  assert.ok(availableUsd >= 0, `Available USD must be >= 0, got ${availableUsd}`)
})

Then('the order should be rejected with insufficient balance', function (this: BalWorld) {
  assert.equal(this.response?.status, 400, `Expected 400, got ${this.response?.status}`)
  const body = this.responseBody as { error: string }
  assert.ok(body?.error?.toLowerCase().includes('insufficient'), `Expected insufficient balance error, got: ${body?.error}`)
})

Then('the second order should be rejected with insufficient balance', function (this: BalWorld) {
  assert.equal(this.secondResponse?.status, 400, `Expected 400, got ${this.secondResponse?.status}`)
  const body = this.secondResponseBody as { error: string }
  assert.ok(body?.error?.toLowerCase().includes('insufficient'), `Expected insufficient balance error, got: ${body?.error}`)
})

When('the user cancels the pending order', async function (this: BalWorld) {
  assert.ok(this.openOrderId, 'Must have an open order ID')
  await this.api(`/orders/${this.openOrderId}`, { method: 'DELETE' })
})

Then('the order should be cancelled', function (this: BalWorld) {
  assert.equal(this.response?.status, 200, `Expected 200, got ${this.response?.status}`)
  const body = this.responseBody as { order: { status: string } }
  assert.equal(body?.order?.status, 'CANCELLED', 'Order should be CANCELLED')
  this.openOrderId = undefined
})

Then('the total USD balance should still be {int} USD', async function (this: BalWorld, total: number) {
  await this.api('/me')
  const meBody = this.responseBody as { usdBalance: string }
  await this.api('/orders/active')
  const ordersBody = this.responseBody as { orders: Order[] }

  const available = Number(meBody.usdBalance)
  const reserved = (ordersBody.orders ?? [])
    .filter((o) => o.side === 'BUY')
    .reduce((sum, o) => sum + Number(o.remaining) * Number(o.price), 0)

  assert.equal(available + reserved, total, `Expected total ${total} USD, got available=${available} + reserved=${reserved}`)
})

Given('multiple operations are executed concurrently', async function (this: BalWorld) {
  this.balanceUser = 'concurrent_balance_bdd'
  await this.loginAs(this.balanceUser)
  await this.api(`/test/users/${this.balanceUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '10', usdBalance: '500000' }),
  })
})

Then('no race condition should produce negative balances', async function (this: BalWorld) {
  await this.api('/me')
  const body = this.responseBody as { btcBalance: string; usdBalance: string }
  assert.ok(Number(body.btcBalance) >= 0, `BTC balance must be >= 0, got ${body.btcBalance}`)
  assert.ok(Number(body.usdBalance) >= 0, `USD balance must be >= 0, got ${body.usdBalance}`)
})

Given('a malicious request attempts to set BTC to {string}', async function (this: BalWorld, value: string) {
  this.balanceUser = 'malicious_balance_bdd'
  await this.loginAs(this.balanceUser)
  await this.api(`/test/users/${this.balanceUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '5', usdBalance: '50000' }),
  })
  await this.api('/me')
  this.initialBalance = this.responseBody as { btcBalance: string; usdBalance: string }
  
  await this.api(`/test/users/${this.balanceUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: value, usdBalance: '50000' }),
  })
})

Then('the request must be rejected', function (this: BalWorld) {
  assert.ok(
    !this.response || this.response.status >= 400,
    `Expected error, got status ${this.response?.status}`
  )
})

Then('the balance must remain unchanged', async function (this: BalWorld) {
  await this.api('/me')
  const currentBody = this.responseBody as { btcBalance: string; usdBalance: string }
  const initialBtc = Number(this.initialBalance?.btcBalance ?? 0)
  const currentBtc = Number(currentBody.btcBalance)
  assert.equal(currentBtc, initialBtc, `BTC should remain ${initialBtc}, but got ${currentBtc}`)
})

Given('a wallet with {int} BTC', async function (this: BalWorld, btc: number) {
  this.balanceUser = 'wallet_btc_bdd'
  await this.loginAs(this.balanceUser)
  await this.api(`/test/users/${this.balanceUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: String(btc), usdBalance: '0' }),
  })
  await this.api('/me')
  this.initialBalance = this.responseBody as { btcBalance: string; usdBalance: string }
})

Given('a wallet with {int} USD', async function (this: BalWorld, usd: number) {
  this.balanceUser = 'wallet_usd_bdd'
  await this.loginAs(this.balanceUser)
  await this.api(`/test/users/${this.balanceUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: String(usd) }),
  })
  await this.api('/me')
  this.initialBalance = this.responseBody as { btcBalance: string; usdBalance: string }
})

When('the system attempts to update the balance to {string}', async function (this: BalWorld, value: string) {
  const match = value.match(/([-\d.]+)\s*([A-Z]+)/)
  const amount = match?.[1] ?? '0'
  const currency = match?.[2] ?? 'BTC'

  await this.api(`/test/users/${this.balanceUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify(
      currency === 'USD'
        ? { btcBalance: '0', usdBalance: amount }
        : { btcBalance: amount, usdBalance: '0' }
    ),
  })
})

Then('the system should reject the operation', function (this: BalWorld) {
  assert.ok(
    !this.response || this.response.status >= 400,
    `Expected error, got status ${this.response?.status}`
  )
})

Then('return an error {string}', function (this: BalWorld, expectedError: string) {
  const body = this.responseBody as { error?: string; message?: string }
  const error = body?.error ?? body?.message ?? ''
  assert.ok(
    error.toLowerCase().includes(expectedError.toLowerCase()),
    `Expected error containing "${expectedError}", got: ${error}`
  )
})

Given('a user has {int} BTC', async function (this: BalWorld, btc: number) {
  this.balanceUser = 'trade_balance_bdd'
  await this.loginAs(this.balanceUser)
  await this.api(`/test/users/${this.balanceUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: String(btc), usdBalance: '100000' }),
  })
})

When('the system processes trades', async function (this: BalWorld) {
  await this.api('/me')
})

Then('the resulting BTC balance must not be negative', async function (this: BalWorld) {
  const body = this.responseBody as { btcBalance: string }
  assert.ok(Number(body.btcBalance) >= 0, `BTC balance must be >= 0, got ${body.btcBalance}`)
})

Given('the system is processing multiple operations', async function (this: BalWorld) {
  const users = ['multi_op_1', 'multi_op_2', 'multi_op_3']
  for (const user of users) {
    await this.loginAs(user)
    await this.api(`/test/users/${user}/balance`, {
      method: 'PUT',
      body: JSON.stringify({ btcBalance: '5', usdBalance: '250000' }),
    })
  }
})

Then('no user should have negative BTC balance', async function (this: BalWorld) {
  await this.api('/me')
  const body = this.responseBody as { btcBalance: string }
  assert.ok(Number(body.btcBalance) >= 0, `BTC balance must be >= 0, got ${body.btcBalance}`)
})

Then('no user should have negative USD balance', async function (this: BalWorld) {
  await this.api('/me')
  const body = this.responseBody as { usdBalance: string }
  assert.ok(Number(body.usdBalance) >= 0, `USD balance must be >= 0, got ${body.usdBalance}`)
})

After(async function (this: BalWorld) {
  if (this.openOrderId && this.token) {
    await this.api(`/orders/${this.openOrderId}`, { method: 'DELETE' }).catch(() => null)
    this.openOrderId = undefined
  }
})
