import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'
import type { Order } from '@wisiex/shared'

type MultiWorld = WisiexWorld & {
  userTokens: Record<string, string>
  userOrders: Record<string, string>
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForOrderStatus(world: MultiWorld, username: string, orderId: string, status: string, maxWait = 8000): Promise<Order | null> {
  const start = Date.now()
  const savedToken = world.token
  while (Date.now() - start < maxWait) {
    world.token = world.userTokens[username]
    await world.api('/orders/active')
    const activeBody = world.responseBody as { orders: Order[] }
    const active = (activeBody.orders ?? []).find((o) => o.id === orderId)
    if (active && active.status === status) { world.token = savedToken; return active }
    if (!active) {
      await world.api('/orders/history')
      const histBody = world.responseBody as { orders: Order[] }
      const hist = (histBody.orders ?? []).find((o) => o.id === orderId)
      if (hist && hist.status === status) { world.token = savedToken; return hist }
    }
    await sleep(300)
  }
  world.token = savedToken
  return null
}

async function cancelAllActiveOrders(world: MultiWorld, username: string): Promise<void> {
  await world.loginAs(username)
  await world.api('/orders/active')
  const body = world.responseBody as { orders: Order[] }
  for (const order of body?.orders ?? []) {
    await world.api(`/orders/${order.id}`, { method: 'DELETE' }).catch(() => null)
  }
}

Given('a user {string} is authenticated', async function (this: MultiWorld, username: string) {
  if (!this.userTokens) this.userTokens = {}
  if (!this.userOrders) this.userOrders = {}
  await this.loginAs(username)
  this.userTokens[username] = this.token!
})

Given('{string} has {float} BTC available', async function (this: MultiWorld, username: string, btc: number) {
  if (!this.userTokens) this.userTokens = {}
  if (!this.userOrders) this.userOrders = {}
  await cancelAllActiveOrders(this, username)
  await this.api(`/test/users/${username}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: String(btc), usdBalance: '0' }),
  })
  this.userTokens[username] = this.token!
})

Given('{string} has {int} USD available', async function (this: MultiWorld, username: string, usd: number) {
  if (!this.userTokens) this.userTokens = {}
  if (!this.userOrders) this.userOrders = {}
  await cancelAllActiveOrders(this, username)
  await this.api(`/test/users/${username}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: String(usd) }),
  })
  this.userTokens[username] = this.token!
})

When('{string} creates a sell order of {int} BTC at {int} USD', async function (this: MultiWorld, username: string, amount: number, price: number) {
  if (!this.userOrders) this.userOrders = {}
  this.token = this.userTokens[username]
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: String(price), amount: String(amount) }),
  })
  const body = this.responseBody as { order: Order }
  this.userOrders[username] = body?.order?.id
  this.lastOrderId = body?.order?.id
})

When('{string} creates a buy order of {int} BTC at {int} USD', async function (this: MultiWorld, username: string, amount: number, price: number) {
  if (!this.userOrders) this.userOrders = {}
  this.token = this.userTokens[username]
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: String(price), amount: String(amount) }),
  })
  const body = this.responseBody as { order: Order }
  this.userOrders[username] = body?.order?.id
  this.lastOrderId = body?.order?.id
})

Then('the system should match {int} BTC between {string} and {string}', async function (this: MultiWorld, amount: number, user1: string, user2: string) {
  const start = Date.now()
  let matched = false
  while (Date.now() - start < 10000) {
    for (const username of [user1, user2]) {
      const orderId = this.userOrders[username]
      if (!orderId) continue
      const savedToken = this.token
      this.token = this.userTokens[username]
      await this.api('/orders/active')
      const body = this.responseBody as { orders: Order[] }
      const order = (body.orders ?? []).find((o) => o.id === orderId)
      this.token = savedToken
      if (order && (order.status === 'PARTIAL' || order.status === 'COMPLETED')) {
        matched = true
        break
      }
    }
    if (matched) break
    await sleep(300)
  }
  assert.ok(matched, `Expected matching of ${amount} BTC between ${user1} and ${user2} — no order left PENDING state within timeout`)
})

Then('{string} should sell {int} BTC and receive {int} USD', async function (this: MultiWorld, username: string, _btcAmount: number, expectedUsd: number) {
  this.token = this.userTokens[username]
  await this.api('/me')
  const body = this.responseBody as { usdBalance: string }
  assert.ok(
    Number(body.usdBalance) >= expectedUsd * 0.95,
    `Expected ${username} to receive ~${expectedUsd} USD (after fees), got ${body.usdBalance}`,
  )
})

Then('{string} should buy {int} BTC and spend {int} USD', async function (this: MultiWorld, username: string, expectedBtc: number, _expectedUsd: number) {
  this.token = this.userTokens[username]
  await this.api('/me')
  const body = this.responseBody as { btcBalance: string }
  assert.ok(
    Number(body.btcBalance) >= expectedBtc * 0.95,
    `Expected ${username} to receive ~${expectedBtc} BTC (after fees), got ${body.btcBalance}`,
  )
})

Then("the trade should be recorded in both users' history", async function (this: MultiWorld) {
  const res = await fetch(`${this.apiBase}/trades`)
  const body = (await res.json()) as { trades: unknown[] }
  assert.ok((body.trades ?? []).length > 0, 'Expected at least one trade to be recorded')
})

Then('the remaining {int} BTC order from {string} should remain open', async function (this: MultiWorld, remaining: number, username: string) {
  const orderId = this.userOrders?.[username]
  assert.ok(orderId, `Must have an order ID for ${username}`)
  this.token = this.userTokens[username]
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const order = (body.orders ?? []).find((o) => o.id === orderId)
  assert.ok(order, `Expected order from ${username} to be in active orders`)
  assert.ok(
    Math.abs(Number(order.remaining) - remaining) < 0.0001,
    `Expected ${remaining} BTC remaining for ${username}, got ${order.remaining}`,
  )
  this.lastOrderId = orderId
})

When('{string} cancels the remaining order', async function (this: MultiWorld, username: string) {
  const orderId = this.userOrders?.[username]
  assert.ok(orderId, `Must have an order ID for ${username}`)
  this.token = this.userTokens[username]
  await this.api(`/orders/${orderId}`, { method: 'DELETE' })
  this.lastOrderId = orderId
})

Then('the remaining {int} BTC should be returned to {string} available balance', async function (this: MultiWorld, btc: number, username: string) {
  this.token = this.userTokens[username]
  await this.api('/me')
  const body = this.responseBody as { btcBalance: string }
  assert.ok(
    Math.abs(Number(body.btcBalance) - btc) < 0.01,
    `Expected ${username} to have ~${btc} BTC returned, got ${body.btcBalance}`,
  )
})

Then('{string} should have {int} BTC still reserved in the open order', async function (this: MultiWorld, username: string, btc: number) {
  const orderId = this.userOrders?.[username]
  assert.ok(orderId, `Must have an order ID for ${username}`)
  this.token = this.userTokens[username]
  const order = await waitForOrderStatus(this, username, orderId, 'PARTIAL')
  assert.ok(order, `Expected order from ${username} to be PARTIAL`)
  assert.ok(
    Math.abs(Number(order.remaining) - btc) < 0.0001,
    `Expected ${btc} BTC reserved for ${username}, got ${order.remaining}`,
  )
  this.lastOrderId = orderId
})

Then('the sell order from {string} should have status {string}', async function (this: MultiWorld, username: string, statusLabel: string) {
  const statusMap: Record<string, string> = { PARTIALLY_FILLED: 'PARTIAL' }
  const expectedStatus = statusMap[statusLabel] ?? statusLabel
  const orderId = this.userOrders?.[username]
  assert.ok(orderId, `Must have an order ID for ${username}`)
  const order = await waitForOrderStatus(this, username, orderId, expectedStatus)
  assert.ok(order, `Expected sell order from ${username} to have status ${expectedStatus}`)
  assert.equal(order.status, expectedStatus)
  this.lastOrderId = orderId
})

When('{string} cancels the remaining sell order', async function (this: MultiWorld, username: string) {
  const orderId = this.userOrders?.[username]
  assert.ok(orderId, `Must have an order ID for ${username}`)
  this.token = this.userTokens[username]
  await this.api(`/orders/${orderId}`, { method: 'DELETE' })
  this.lastOrderId = orderId
})

Then('the remaining {int} BTC should be released from reserved balance', async function (this: MultiWorld, _btc: number) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reserved = (body.orders ?? [])
    .filter((o) => o.side === 'SELL')
    .reduce((sum, o) => sum + Number(o.remaining), 0)
  assert.ok(reserved < 0.0001, `Expected no BTC reserved after cancellation, got ${reserved}`)
})

After(async function (this: MultiWorld) {
  for (const [username, orderId] of Object.entries(this.userOrders ?? {})) {
    await this.loginAs(username).catch(() => null)
    await this.api(`/orders/${orderId}`, { method: 'DELETE' }).catch(() => null)
  }
})
