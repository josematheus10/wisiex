import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'
import type { Order } from '@wisiex/shared'

type BalWorld = WisiexWorld & {
  balanceUser?: string
  secondResponse?: Response
  secondResponseBody?: unknown
  openOrderId?: string
}

Given('the user has {int} USD available', async function (this: BalWorld, usd: number) {
  this.balanceUser = 'balance_usd_bdd'
  await this.loginAs(this.balanceUser)
  await this.api(`/test/users/${this.balanceUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '100', usdBalance: String(usd) }),
  })
})

Given('the user has {float} BTC available', async function (this: BalWorld, btc: number) {
  this.balanceUser = 'balance_btc_bdd'
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

Given('the user has an open buy order of {int} BTC at {int} USD', async function (this: BalWorld, amount: number, price: number) {
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: String(price), amount: String(amount) }),
  })
  const body = this.responseBody as { order: Order }
  this.openOrderId = body?.order?.id
})

Given('the user has an open sell order of {int} BTC at {int} USD', async function (this: BalWorld, amount: number, price: number) {
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: String(price), amount: String(amount) }),
  })
  const body = this.responseBody as { order: Order }
  this.openOrderId = body?.order?.id
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

After(async function (this: BalWorld) {
  if (this.openOrderId && this.token) {
    await this.api(`/orders/${this.openOrderId}`, { method: 'DELETE' }).catch(() => null)
    this.openOrderId = undefined
  }
})
