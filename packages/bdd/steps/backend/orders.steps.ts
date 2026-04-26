import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'
import type { Order } from '@wisiex/shared'

type World = WisiexWorld & { lastCreatedOrder?: Order }

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

After(async function (this: World) {
  if (this.lastOrderId && this.token) {
    await this.api(`/orders/${this.lastOrderId}`, { method: 'DELETE' }).catch(() => null)
    this.lastOrderId = null
  }
})
