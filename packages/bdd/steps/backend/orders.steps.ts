import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'
import type { Order } from '@wisiex/shared'

type World = WisiexWorld & {
  lastCreatedOrder?: Order
  partialCounterUser?: string
  partialInitialUsd?: number
  partialInitialBtc?: number
  walletOrderId?: string
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

Given('the user has sufficient USD balance', async function (this: World) {
  await this.loginAs('buy_order_bdd')
})

Given('the user has sufficient BTC balance', async function (this: World) {
  await this.loginAs('sell_order_bdd')
})

When(
  'the user submits a buy order with amount {int} BTC and price {int} USD',
  async function (this: World, amount: number, price: number) {
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'BUY', price: String(price), amount: String(amount) }),
    })
    const body = this.responseBody as { order?: Order }
    if (body?.order?.id) this.lastOrderId = body.order.id
  },
)

When(
  'the user submits a sell order with amount {int} BTC and price {int} USD',
  async function (this: World, amount: number, price: number) {
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'SELL', price: String(price), amount: String(amount) }),
    })
    const body = this.responseBody as { order?: Order }
    if (body?.order?.id) this.lastOrderId = body.order.id
  },
)

Then('the order should be created', function (this: World) {
  assert.equal(this.response?.status, 201, `Expected 201, got ${this.response?.status}`)
  const body = this.responseBody as { order: Order }
  assert.ok(body?.order?.id, 'Response must contain order.id')
  this.lastOrderId = body.order.id
})

Given('there is a sell order in the order book of {float} BTC at {int} USD', async function (this: World, amount: number, price: number) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
  const counterUser = 'partial_sell_counter_bdd'
  this.partialCounterUser = counterUser
  await this.loginAs(counterUser)
  await this.api(`/test/users/${counterUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: String(amount + 1), usdBalance: '0' }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: String(price), amount: String(amount) }),
  })
})

Given('there is a buy order in the order book of {float} BTC at {int} USD', async function (this: World, amount: number, price: number) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
  const counterUser = 'partial_buy_counter_bdd'
  this.partialCounterUser = counterUser
  await this.loginAs(counterUser)
  await this.api(`/test/users/${counterUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: String(amount * price + 1000) }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: String(price), amount: String(amount) }),
  })
})

Then('{int} USD should be deducted from the user balance', async function (this: World, expectedDeducted: number) {
  await sleep(500)
  const initialUsd = this.partialInitialUsd ?? 0
  await this.api('/me')
  const meBody = this.responseBody as { usdBalance: string }
  await this.api('/orders/active')
  const ordersBody = this.responseBody as { orders: Order[] }
  const available = Number(meBody.usdBalance)
  const reserved = (ordersBody.orders ?? [])
    .filter((o) => o.side === 'BUY')
    .reduce((sum, o) => sum + Number(o.remaining) * Number(o.price), 0)
  const deducted = initialUsd - available - reserved
  assert.ok(
    Math.abs(deducted - expectedDeducted) < 1,
    `Expected ${expectedDeducted} USD deducted, got ${deducted} (available=${available}, reserved=${reserved}, initial=${initialUsd})`,
  )
})

Then('{float} BTC should be deducted from the user balance', async function (this: World, expectedDeducted: number) {
  await sleep(500)
  const initialBtc = this.partialInitialBtc ?? 0
  await this.api('/me')
  const meBody = this.responseBody as { btcBalance: string }
  await this.api('/orders/active')
  const ordersBody = this.responseBody as { orders: Order[] }
  const available = Number(meBody.btcBalance)
  const reserved = (ordersBody.orders ?? [])
    .filter((o) => o.side === 'SELL')
    .reduce((sum, o) => sum + Number(o.remaining), 0)
  const deducted = initialBtc - available - reserved
  assert.ok(
    Math.abs(deducted - expectedDeducted) < 0.01,
    `Expected ${expectedDeducted} BTC deducted, got ${deducted} (available=${available}, reserved=${reserved}, initial=${initialBtc})`,
  )
})

Then('the remaining {float} BTC should remain as an open buy order', async function (this: World, remaining: number) {
  const orderId = this.walletOrderId ?? this.lastOrderId
  assert.ok(orderId, 'Must have an order ID to check remaining buy order')
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const openOrder = (body.orders ?? []).find((o) => o.id === orderId)
  assert.ok(openOrder, `Expected order ${orderId} to be in active orders as open BUY`)
  assert.equal(openOrder.side, 'BUY', `Expected BUY order, got ${openOrder.side}`)
  assert.ok(
    Math.abs(Number(openOrder.remaining) - remaining) < 0.0001,
    `Expected ${remaining} BTC remaining, got ${openOrder.remaining}`,
  )
})

Then('the corresponding USD amount should remain reserved', async function (this: World) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reserved = (body.orders ?? [])
    .filter((o) => o.side === 'BUY')
    .reduce((sum, o) => sum + Number(o.remaining) * Number(o.price), 0)
  assert.ok(reserved > 0, `Expected USD to remain reserved in active BUY orders, got ${reserved}`)
})

Then('the order status should be {string}', async function (this: World, statusLabel: string) {
  const statusMap: Record<string, string> = { 'PARTIALLY_FILLED': 'PARTIAL' }
  const expectedStatus = statusMap[statusLabel] ?? statusLabel
  const responseOrder = (this.responseBody as { order?: Order })?.order
  if (responseOrder?.status !== undefined) {
    assert.equal(responseOrder.status, expectedStatus, `Expected status ${expectedStatus}, got ${responseOrder.status}`)
    return
  }
  const orderId = this.walletOrderId ?? this.lastOrderId
  assert.ok(orderId, 'Must have an order ID to check status')
  await this.api('/orders/active')
  const activeBody = this.responseBody as { orders: Order[] }
  const activeOrder = (activeBody.orders ?? []).find((o) => o.id === orderId)
  if (activeOrder) {
    assert.equal(activeOrder.status, expectedStatus, `Expected status ${expectedStatus}, got ${activeOrder.status}`)
    return
  }
  await this.api('/orders/history')
  const histBody = this.responseBody as { orders: Order[] }
  const histOrder = (histBody.orders ?? []).find((o) => o.id === orderId)
  assert.ok(histOrder, `Order ${orderId} not found in active or history`)
  assert.equal(histOrder.status, expectedStatus, `Expected status ${expectedStatus}, got ${histOrder.status}`)
})

Then('the remaining {float} BTC should remain as an open sell order', async function (this: World, remaining: number) {
  const orderId = this.walletOrderId ?? this.lastOrderId
  assert.ok(orderId, 'Must have an order ID to check remaining sell order')
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const openOrder = (body.orders ?? []).find((o) => o.id === orderId)
  assert.ok(openOrder, `Expected order ${orderId} to be in active orders as open SELL`)
  assert.equal(openOrder.side, 'SELL', `Expected SELL order, got ${openOrder.side}`)
  assert.ok(
    Math.abs(Number(openOrder.remaining) - remaining) < 0.0001,
    `Expected ${remaining} BTC remaining, got ${openOrder.remaining}`,
  )
})

Then('the remaining BTC should stay reserved', async function (this: World) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reserved = (body.orders ?? [])
    .filter((o) => o.side === 'SELL')
    .reduce((sum, o) => sum + Number(o.remaining), 0)
  assert.ok(reserved > 0, `Expected BTC to remain reserved in active SELL orders, got ${reserved}`)
})

After(async function (this: World) {
  if (this.lastOrderId && this.token) {
    await this.api(`/orders/${this.lastOrderId}`, { method: 'DELETE' }).catch(() => null)
    this.lastOrderId = null
  }
  if (this.partialCounterUser) {
    const savedToken = this.token
    await this.loginAs(this.partialCounterUser)
    await this.api('/orders/active')
    const body = this.responseBody as { orders: Order[] }
    for (const order of body?.orders ?? []) {
      await this.api(`/orders/${order.id}`, { method: 'DELETE' }).catch(() => null)
    }
    this.token = savedToken
    this.partialCounterUser = undefined
  }
})
