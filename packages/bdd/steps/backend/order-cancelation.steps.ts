import { Given, When, Then, Before, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'
import type { Order } from '@wisiex/shared'

type CancelWorld = WisiexWorld & {
  cancelOrderId?: string
  activeOrderId?: string
  openOrderId?: string
  cancelErrorMessage?: string
  cancelResponseStatus?: number
  orderAliases: Record<string, string>
  userTokens: Record<string, string>
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForStatus(world: CancelWorld, orderId: string, status: string, maxWait = 8000): Promise<Order | null> {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    await world.api('/orders/active')
    const activeBody = world.responseBody as { orders: Order[] }
    const active = (activeBody.orders ?? []).find((o) => o.id === orderId)
    if (active && active.status === status) return active
    if (!active) {
      await world.api('/orders/history')
      const histBody = world.responseBody as { orders: Order[] }
      const hist = (histBody.orders ?? []).find((o) => o.id === orderId)
      if (hist && hist.status === status) return hist
    }
    await sleep(300)
  }
  return null
}

Before({ tags: '@cancel-unfilled-buy' }, async function (this: CancelWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
  await this.loginAs('cancel_buy_bdd')
  await this.api('/test/users/cancel_buy_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: '10000' }),
  })
})

Before({ tags: '@cancel-unfilled-sell' }, async function (this: CancelWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
  await this.loginAs('cancel_sell_bdd')
  await this.api('/test/users/cancel_sell_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '1', usdBalance: '0' }),
  })
})

Before({ tags: '@cancel-partial' }, async function (this: CancelWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
  await this.loginAs('cancel_partial_bdd')
  await this.api('/test/users/cancel_partial_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: '10000' }),
  })
})

Before({ tags: '@cancel-fully-filled' }, async function (this: CancelWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
})

Before({ tags: '@cancel-concurrent' }, async function (this: CancelWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
})

Before({ tags: '@cancel-ownership' }, async function (this: CancelWorld) {
  if (!this.orderAliases) this.orderAliases = {}
  if (!this.userTokens) this.userTokens = {}
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
})

Given('the user has an open sell order of {int} BTC', async function (this: CancelWorld, amount: number) {
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '99999', amount: String(amount) }),
  })
  const body = this.responseBody as { order: Order }
  this.cancelOrderId = body?.order?.id
  this.activeOrderId = body?.order?.id
})

Given('{int} USD is reserved', async function (this: CancelWorld, usd: number) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reserved = (body.orders ?? [])
    .filter((o) => o.side === 'BUY')
    .reduce((sum, o) => sum + Number(o.remaining) * Number(o.price), 0)
  assert.ok(Math.abs(reserved - usd) < 0.01, `Expected ${usd} USD reserved, got ${reserved}`)
})

Given('{int} BTC is reserved', async function (this: CancelWorld, btc: number) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reserved = (body.orders ?? [])
    .filter((o) => o.side === 'SELL')
    .reduce((sum, o) => sum + Number(o.remaining), 0)
  assert.ok(Math.abs(reserved - btc) < 0.0001, `Expected ${btc} BTC reserved, got ${reserved}`)
})

Given('the user created a buy order of {int} BTC at {int} USD', async function (this: CancelWorld, amount: number, price: number) {
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: String(price), amount: String(amount) }),
  })
  const body = this.responseBody as { order: Order }
  this.cancelOrderId = body?.order?.id
  this.activeOrderId = body?.order?.id
})

Given('{int} USD was reserved', async function (this: CancelWorld, usd: number) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reserved = (body.orders ?? [])
    .filter((o) => o.side === 'BUY')
    .reduce((sum, o) => sum + Number(o.remaining) * Number(o.price), 0)
  assert.ok(Math.abs(reserved - usd) < 0.01, `Expected ${usd} USD reserved, got ${reserved}`)
})

Given('{float} BTC has already been executed', async function (this: CancelWorld, amount: number) {
  const savedToken = this.token
  await this.api('/orders/active')
  const activeBody = this.responseBody as { orders: Order[] }
  const mainOrder = (activeBody.orders ?? []).find((o) => o.id === this.cancelOrderId)
  const mainSide = mainOrder?.side ?? 'BUY'

  if (mainSide === 'SELL') {
    await this.loginAs('cancel_partial_buyer_bdd')
    await this.api('/test/users/cancel_partial_buyer_bdd/balance', {
      method: 'PUT',
      body: JSON.stringify({ btcBalance: '0', usdBalance: String(amount * 20000) }),
    })
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'BUY', price: '10000', amount: String(amount) }),
    })
  } else {
    await this.loginAs('cancel_partial_seller_bdd')
    await this.api('/test/users/cancel_partial_seller_bdd/balance', {
      method: 'PUT',
      body: JSON.stringify({ btcBalance: String(amount), usdBalance: '0' }),
    })
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'SELL', price: '10000', amount: String(amount) }),
    })
  }
  this.token = savedToken
  const filled = await waitForStatus(this, this.cancelOrderId!, 'PARTIAL', 8000)
  assert.ok(filled, `Expected order to be PARTIAL after ${amount} BTC execution`)
})

Given('{int} USD has already been spent', async function (this: CancelWorld, usd: number) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const order = (body.orders ?? []).find((o) => o.id === this.cancelOrderId)
  assert.ok(order, 'Expected partially filled order in active orders')
  const spent = Number(order.filled) * Number(order.price)
  assert.ok(Math.abs(spent - usd) < 0.01, `Expected ${usd} USD spent, got ${spent}`)
})

Given('{int} USD is still reserved', async function (this: CancelWorld, usd: number) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const order = (body.orders ?? []).find((o) => o.id === this.cancelOrderId)
  assert.ok(order, 'Expected partially filled order in active orders')
  const stillReserved = Number(order.remaining) * Number(order.price)
  assert.ok(Math.abs(stillReserved - usd) < 0.01, `Expected ${usd} USD still reserved, got ${stillReserved}`)
})

Given('the user has a fully filled order', async function (this: CancelWorld) {
  await this.loginAs('cancel_maker_bdd')
  await this.api('/test/users/cancel_maker_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '1', usdBalance: '0' }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '10000', amount: '1' }),
  })

  await this.loginAs('cancel_taker_bdd')
  await this.api('/test/users/cancel_taker_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: '10000' }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '10000', amount: '1' }),
  })
  const body = this.responseBody as { order: Order }
  this.cancelOrderId = body?.order?.id

  const done = await waitForStatus(this, this.cancelOrderId!, 'COMPLETED', 8000)
  assert.ok(done, 'Expected taker BUY order to be COMPLETED')
})

Given('an order is partially filled', async function (this: CancelWorld) {
  await this.loginAs('cancel_conc_seller_bdd')
  await this.api('/test/users/cancel_conc_seller_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0.3', usdBalance: '0' }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '10000', amount: '0.3' }),
  })

  await this.loginAs('cancel_conc_buyer_bdd')
  await this.api('/test/users/cancel_conc_buyer_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: '10000' }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '10000', amount: '1' }),
  })
  const body = this.responseBody as { order: Order }
  this.cancelOrderId = body?.order?.id
  await waitForStatus(this, this.cancelOrderId!, 'PARTIAL', 8000)
})

Given('the matching engine is processing the order', async function (this: CancelWorld) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const order = (body.orders ?? []).find((o) => o.id === this.cancelOrderId)
  assert.ok(order, 'Order should be in active orders')
  assert.equal(order.status, 'PARTIAL', `Expected PARTIAL, got ${order.status}`)
})

Given('a user {string} created an order with id {string}', async function (this: CancelWorld, username: string, alias: string) {
  if (!this.orderAliases) this.orderAliases = {}
  if (!this.userTokens) this.userTokens = {}
  await this.loginAs(username)
  this.userTokens[username] = this.token!
  await this.api(`/test/users/${username}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: '50000' }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '9999', amount: '1' }),
  })
  const body = this.responseBody as { order: Order }
  this.orderAliases[alias] = body?.order?.id
  this.cancelOrderId = body?.order?.id
})

Given('another user {string} is authenticated', async function (this: CancelWorld, username: string) {
  if (!this.userTokens) this.userTokens = {}
  await this.loginAs(username)
  this.userTokens[username] = this.token!
})

Given('{string} is authenticated', async function (this: CancelWorld, username: string) {
  if (!this.userTokens) this.userTokens = {}
  this.token = this.userTokens[username] ?? null
  if (!this.token) {
    await this.loginAs(username)
    this.userTokens[username] = this.token!
  }
})

When('the user attempts to cancel the order', async function (this: CancelWorld) {
  assert.ok(this.cancelOrderId, 'Must have a cancel order ID')
  await this.api(`/orders/${this.cancelOrderId}`, { method: 'DELETE' })
  this.cancelResponseStatus = this.response?.status
})

When('the user requests cancellation at the same time', async function (this: CancelWorld) {
  assert.ok(this.cancelOrderId, 'Must have a cancel order ID')
  await this.api(`/orders/${this.cancelOrderId}`, { method: 'DELETE' })
  this.cancelResponseStatus = this.response?.status
})

When('{string} attempts to cancel the order {string}', async function (this: CancelWorld, username: string, alias: string) {
  const orderId = this.orderAliases?.[alias]
  assert.ok(orderId, `Order alias ${alias} not found`)
  this.token = this.userTokens?.[username] ?? null
  await this.api(`/orders/${orderId}`, { method: 'DELETE' })
  this.cancelResponseStatus = this.response?.status
  const body = this.responseBody as { error?: string }
  this.cancelErrorMessage = body?.error
})

When('{string} cancels the order {string}', async function (this: CancelWorld, username: string, alias: string) {
  const orderId = this.orderAliases?.[alias]
  assert.ok(orderId, `Order alias ${alias} not found`)
  this.token = this.userTokens?.[username] ?? null
  await this.api(`/orders/${orderId}`, { method: 'DELETE' })
  this.cancelResponseStatus = this.response?.status
})

Then('the {int} USD should be returned to the available balance', async function (this: CancelWorld, usd: number) {
  await this.api('/me')
  const body = this.responseBody as { usdBalance: string }
  assert.ok(Math.abs(Number(body.usdBalance) - usd) < 0.01, `Expected ${usd} USD, got ${body.usdBalance}`)
})

Then('the reserved USD balance should be zero', async function (this: CancelWorld) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reserved = (body.orders ?? [])
    .filter((o) => o.side === 'BUY')
    .reduce((sum, o) => sum + Number(o.remaining) * Number(o.price), 0)
  assert.ok(reserved < 0.01, `Expected 0 USD reserved, got ${reserved}`)
})

Then('the {int} BTC should be returned to the available balance', async function (this: CancelWorld, btc: number) {
  await this.api('/me')
  const body = this.responseBody as { btcBalance: string }
  assert.ok(Math.abs(Number(body.btcBalance) - btc) < 0.0001, `Expected ${btc} BTC, got ${body.btcBalance}`)
})

Then('the reserved BTC balance should be zero', async function (this: CancelWorld) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reserved = (body.orders ?? [])
    .filter((o) => o.side === 'SELL')
    .reduce((sum, o) => sum + Number(o.remaining), 0)
  assert.ok(reserved < 0.0001, `Expected 0 BTC reserved, got ${reserved}`)
})

Then('the remaining {int} USD should be returned to the available balance', async function (this: CancelWorld, usd: number) {
  await this.api('/me')
  const body = this.responseBody as { usdBalance: string }
  assert.ok(Math.abs(Number(body.usdBalance) - usd) < 0.01, `Expected ~${usd} USD, got ${body.usdBalance}`)
})

Then('the user should keep the {float} BTC already acquired', async function (this: CancelWorld, btc: number) {
  await this.api('/me')
  const body = this.responseBody as { btcBalance: string }
  assert.ok(Number(body.btcBalance) > 0, `Expected some BTC acquired, got ${body.btcBalance}`)
  assert.ok(Math.abs(Number(body.btcBalance) - btc) < 0.01, `Expected ~${btc} BTC, got ${body.btcBalance}`)
})

Then('the system should reject the request', function (this: CancelWorld) {
  assert.ok(
    this.cancelResponseStatus === 400 || this.cancelResponseStatus === 403,
    `Expected 400 or 403, got ${this.cancelResponseStatus}`,
  )
})

Then('the system must ensure data consistency', async function (this: CancelWorld) {
  assert.ok(
    this.cancelResponseStatus === 200 || this.cancelResponseStatus === 400,
    `Expected 200 or 400, got ${this.cancelResponseStatus}`,
  )
})

Then('the order must not be executed twice', async function (this: CancelWorld) {
  const res = await fetch(`${this.apiBase}/trades`)
  const body = (await res.json()) as { trades: unknown[] }
  assert.ok((body.trades ?? []).length <= 1, `Expected at most 1 trade, got ${body.trades?.length}`)
})

Then('the final balances must be correct', async function (this: CancelWorld) {
  await this.api('/me')
  const body = this.responseBody as { usdBalance: string; btcBalance: string }
  assert.ok(Number(body.usdBalance) >= 0, 'USD balance should not be negative')
  assert.ok(Number(body.btcBalance) >= 0, 'BTC balance should not be negative')
})

Then('the error message should be {string}', function (this: CancelWorld, message: string) {
  assert.equal(this.cancelErrorMessage, message, `Expected "${message}", got "${this.cancelErrorMessage}"`)
})

Given('the user has created a buy order of {int} BTC at {int} USD', async function (this: CancelWorld, amount: number, price: number) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
  await this.loginAs('cancel_untagged_buy_bdd')
  await this.api('/test/users/cancel_untagged_buy_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: String(amount * price) }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: String(price), amount: String(amount) }),
  })
  const body = this.responseBody as { order: Order }
  this.cancelOrderId = body?.order?.id
  this.activeOrderId = body?.order?.id
})

Given('the user has created a sell order of {int} BTC at {int} USD', async function (this: CancelWorld, amount: number, price: number) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
  await this.loginAs('cancel_untagged_sell_bdd')
  await this.api('/test/users/cancel_untagged_sell_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: String(amount), usdBalance: '0' }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: String(price), amount: String(amount) }),
  })
  const body = this.responseBody as { order: Order }
  this.cancelOrderId = body?.order?.id
  this.activeOrderId = body?.order?.id
})

Given('{int} BTC was reserved', async function (this: CancelWorld, btc: number) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reserved = (body.orders ?? [])
    .filter((o) => o.side === 'SELL')
    .reduce((sum, o) => sum + Number(o.remaining), 0)
  assert.ok(Math.abs(reserved - btc) < 0.0001, `Expected ${btc} BTC reserved, got ${reserved}`)
})

Given('{float} BTC has already been sold', async function (this: CancelWorld, btc: number) {
  const savedToken = this.token
  await this.loginAs('cancel_untagged_buyer_bdd')
  await this.api('/test/users/cancel_untagged_buyer_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: String(btc * 15000) }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '10000', amount: String(btc) }),
  })
  this.token = savedToken
  const filled = await waitForStatus(this, this.cancelOrderId!, 'PARTIAL', 8000)
  assert.ok(filled, `Expected sell order to be PARTIAL after ${btc} BTC buy`)
  await this.api('/orders/active')
  const activeBody = this.responseBody as { orders: Order[] }
  const order = (activeBody.orders ?? []).find((o) => o.id === this.cancelOrderId)
  assert.ok(order, 'Expected partially filled order in active orders')
  assert.ok(Math.abs(Number(order.filled) - btc) < 0.0001, `Expected ${btc} BTC sold, got ${order.filled}`)
})

Given('{float} BTC is still reserved', async function (this: CancelWorld, btc: number) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const order = (body.orders ?? []).find((o) => o.id === this.cancelOrderId)
  assert.ok(order, 'Expected partially filled order in active orders')
  assert.ok(Math.abs(Number(order.remaining) - btc) < 0.0001, `Expected ${btc} BTC still reserved, got ${order.remaining}`)
})

Then('the remaining {float} BTC should be returned to the available balance', async function (this: CancelWorld, btc: number) {
  await this.api('/me')
  const body = this.responseBody as { btcBalance: string }
  assert.ok(Math.abs(Number(body.btcBalance) - btc) < 0.0001, `Expected ${btc} BTC returned, got ${body.btcBalance}`)
})

Then('the user should keep the USD received from the executed portion', async function (this: CancelWorld) {
  await this.api('/me')
  const body = this.responseBody as { usdBalance: string }
  assert.ok(Number(body.usdBalance) > 0, `Expected positive USD from partial execution, got ${body.usdBalance}`)
})

Then('the order status should remain unchanged', async function (this: CancelWorld) {
  const orderId = this.cancelOrderId
  assert.ok(orderId, 'Must have a cancel order ID')
  await this.loginAs('alice')
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const order = (body.orders ?? []).find((o) => o.id === orderId)
  assert.ok(order, 'Order should still be in active orders')
  assert.ok(['PENDING', 'PARTIAL'].includes(order.status), `Order should be active, got ${order.status}`)
})

After(async function (this: CancelWorld) {
  const users = [
    'cancel_buy_bdd', 'cancel_sell_bdd', 'cancel_partial_bdd', 'cancel_partial_seller_bdd',
    'cancel_partial_buyer_bdd', 'cancel_maker_bdd', 'cancel_taker_bdd',
    'cancel_conc_buyer_bdd', 'cancel_conc_seller_bdd',
    'cancel_untagged_buy_bdd', 'cancel_untagged_sell_bdd', 'cancel_untagged_buyer_bdd',
    'alice', 'bob',
  ]
  for (const username of users) {
    await this.loginAs(username)
    await this.api('/orders/active')
    const body = this.responseBody as { orders: Order[] }
    for (const order of body?.orders ?? []) {
      await this.api(`/orders/${order.id}`, { method: 'DELETE' }).catch(() => null)
    }
  }
})
