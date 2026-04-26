import { Given, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'
import type { Order } from '@wisiex/shared'

type HistWorld = WisiexWorld & { historyOrders?: Order[] }

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

Given('the user has completed trades', async function (this: HistWorld) {
  await this.loginAs('trades_buy_maker_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '10000', amount: '0.1' }),
  })

  await this.loginAs('trades_sell_maker_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '10000', amount: '0.1' }),
  })

  await sleep(2000)
})

Then('the system should display past trades', async function (this: HistWorld) {
  await this.loginAs('trades_buy_maker_bdd')
  await this.api('/orders/history')
  const body = this.responseBody as { orders: Order[] }
  const orders = body.orders ?? []
  assert.ok(Array.isArray(orders), 'History should be an array')
  assert.ok(orders.length > 0, 'History should not be empty')
})

Then('each trade should include price, volume and type', async function (this: HistWorld) {
  await this.loginAs('trades_buy_maker_bdd')
  await this.api('/orders/history')
  const body = this.responseBody as { orders: Order[] }
  for (const order of body.orders ?? []) {
    assert.ok(order.price !== undefined, 'Order must have price')
    assert.ok(order.amount !== undefined, 'Order must have amount (volume)')
    assert.ok(order.side !== undefined, 'Order must have side (type)')
  }
})
