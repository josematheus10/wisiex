import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'
import type { Order, OrderBook } from '@wisiex/shared'

type BookWorld = WisiexWorld & { orderBook?: OrderBook; bidOrderId?: string; askOrderId?: string }

Given('there are active orders in the system', async function (this: BookWorld) {
  await this.loginAs('seed_ask_ob_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '11000', amount: '1' }),
  })
  const askBody = this.responseBody as { order: Order }
  this.askOrderId = askBody?.order?.id

  await this.loginAs('seed_bid_ob_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '9000', amount: '1' }),
  })
  const bidBody = this.responseBody as { order: Order }
  this.bidOrderId = bidBody?.order?.id
})

When('the user accesses the order book', async function (this: BookWorld) {
  const res = await fetch(`${this.apiBase}/orders/book`)
  const body = (await res.json()) as { orderBook: OrderBook }
  this.orderBook = body.orderBook
})

Then('bids and asks should be displayed', function (this: BookWorld) {
  assert.ok(this.orderBook, 'Order book should be present')
  assert.ok(Array.isArray(this.orderBook!.bids), 'Bids should be an array')
  assert.ok(Array.isArray(this.orderBook!.asks), 'Asks should be an array')
  assert.ok(this.orderBook!.bids.length > 0 || this.orderBook!.asks.length > 0, 'Order book should not be empty')
})

Then('orders with same price should be aggregated', async function (this: BookWorld) {
  await this.loginAs('seed_ask_ob_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '11000', amount: '0.5' }),
  })
  const body = this.responseBody as { order: Order }
  const secondOrderId = body?.order?.id

  const res = await fetch(`${this.apiBase}/orders/book`)
  const bookBody = (await res.json()) as { orderBook: OrderBook }
  const ask11000 = bookBody.orderBook.asks.find((a) => Number(a.price) === 11000)
  assert.ok(ask11000, 'Should have aggregated ask at 11000')
  assert.ok(Number(ask11000.count) >= 2, 'Should aggregate multiple orders at same price')

  if (secondOrderId) {
    await this.api(`/orders/${secondOrderId}`, { method: 'DELETE' }).catch(() => null)
  }
})

After(async function (this: BookWorld) {
  if (this.askOrderId) {
    await this.loginAs('seed_ask_ob_bdd')
    await this.api(`/orders/${this.askOrderId}`, { method: 'DELETE' }).catch(() => null)
    this.askOrderId = undefined
  }
  if (this.bidOrderId) {
    await this.loginAs('seed_bid_ob_bdd')
    await this.api(`/orders/${this.bidOrderId}`, { method: 'DELETE' }).catch(() => null)
    this.bidOrderId = undefined
  }
})
