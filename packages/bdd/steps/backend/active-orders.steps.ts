import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'
import type { Order } from '@wisiex/shared'

type ActiveWorld = WisiexWorld & {
  activeOrders?: Order[]
  activeOrderId?: string
}

Given('the user has active orders', async function (this: ActiveWorld) {
  await this.loginAs('orderbook_trader')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '99999', amount: '0.1' }),
  })
  const body = this.responseBody as { order: Order }
  this.activeOrderId = body?.order?.id
})

When('the user accesses {string}', async function (this: ActiveWorld, section: string) {
  if (section === 'My active orders') {
    await this.api('/orders/active')
    const body = this.responseBody as { orders: Order[] }
    this.activeOrders = body.orders ?? []
  } else if (section === 'My history') {
    await this.api('/orders/history')
    const body = this.responseBody as { orders: Order[] }
    this.activeOrders = body.orders ?? []
  }
})

Then('all active orders should be listed', function (this: ActiveWorld) {
  assert.ok(Array.isArray(this.activeOrders), 'Active orders should be an array')
  assert.ok(this.activeOrders!.length > 0, 'Should have at least one active order')
})

Given('the user has an active order', async function (this: ActiveWorld) {
  await this.loginAs('ob_buyer_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '99998', amount: '0.1' }),
  })
  const body = this.responseBody as { order: Order }
  this.activeOrderId = body?.order?.id
  this.lastOrderId = this.activeOrderId ?? null
})

When('the user cancels the order', async function (this: ActiveWorld & { cancelOrderId?: string; openOrderId?: string }) {
  const orderId = this.cancelOrderId ?? this.activeOrderId ?? this.openOrderId
  assert.ok(orderId, 'Must have an order ID to cancel')
  await this.api(`/orders/${orderId}`, { method: 'DELETE' })
})

Then('the order should be removed from active orders', async function (this: ActiveWorld) {
  assert.equal(this.response?.status, 200, `Expected 200, got ${this.response?.status}`)
  const body = this.responseBody as { order: Order }
  assert.equal(body?.order?.status, 'CANCELLED', 'Order should be CANCELLED')
  this.lastOrderId = null
})

After(async function (this: ActiveWorld) {
  if (this.activeOrderId && this.token) {
    await this.api(`/orders/${this.activeOrderId}`, { method: 'DELETE' }).catch(() => null)
    this.activeOrderId = undefined
  }
})
