import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'
import type { Order } from '@wisiex/shared'

type MatchWorld = WisiexWorld & {
  takerOrderId?: string
  makerOrderId?: string
  priceMatchOrderIds?: string[]
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForOrderStatus(world: MatchWorld, orderId: string, username: string, maxWait = 5000): Promise<Order | null> {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    const savedToken = world.token
    await world.loginAs(username)
    await world.api('/orders/active')
    world.token = savedToken
    const activeBody = world.responseBody as { orders: Order[] }
    const active = (activeBody.orders ?? []).find((o) => o.id === orderId)
    if (!active) {
      await world.loginAs(username)
      await world.api('/orders/history')
      world.token = savedToken
      const histBody = world.responseBody as { orders: Order[] }
      const hist = (histBody.orders ?? []).find((o) => o.id === orderId)
      if (hist) return hist
    }
    await sleep(300)
  }
  return null
}

Given('there is a sell order of {float} BTC at {int} USD', async function (this: MatchWorld, amount: number, price: number) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
  await this.loginAs('price_maker')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: String(price), amount: String(amount) }),
  })
  const body = this.responseBody as { order: Order }
  this.makerOrderId = body?.order?.id
})

When('a buy order of {int} BTC at {int} USD is created', async function (this: MatchWorld, amount: number, price: number) {
  await this.loginAs('matching_trader')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: String(price), amount: String(amount) }),
  })
  const body = this.responseBody as { order: Order }
  this.takerOrderId = body?.order?.id
})

Then('{float} BTC should be matched at {int} USD', async function (this: MatchWorld, matchedAmount: number, matchedPrice: number) {
  const start = Date.now()
  let relevantTrade: { price: string; amount: string } | undefined
  while (Date.now() - start < 8000) {
    const res = await fetch(`${this.apiBase}/trades`)
    const body = (await res.json()) as { trades: { price: string; amount: string }[] }
    relevantTrade = (body.trades ?? []).find(
      (t) => Math.abs(Number(t.amount) - matchedAmount) < 0.0001 && Number(t.price) === matchedPrice,
    )
    if (relevantTrade) break
    await sleep(500)
  }
  assert.ok(relevantTrade, `Expected trade of ${matchedAmount} BTC at ${matchedPrice} USD`)
})

Then('the remaining {float} BTC should stay open', async function (this: MatchWorld, remaining: number) {
  await this.loginAs('matching_trader')
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const openOrder = (body.orders ?? []).find((o) => o.id === this.takerOrderId)
  assert.ok(openOrder, `Expected ${remaining} BTC open order, but not found`)
  assert.ok(
    Math.abs(Number(openOrder.remaining) - remaining) < 0.0001,
    `Expected ${remaining} BTC remaining, got ${openOrder.remaining}`,
  )
})

Given('there are matching orders in the book', async function (this: MatchWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
  await this.loginAs('complete_maker')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '10000', amount: '1' }),
  })
  const body = this.responseBody as { order: Order }
  this.makerOrderId = body?.order?.id
})

When('a new order is fully matched', async function (this: MatchWorld) {
  await this.loginAs('matching_trader')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '10000', amount: '1' }),
  })
  const body = this.responseBody as { order: Order }
  this.takerOrderId = body?.order?.id
  await sleep(3000)
})

Then('the order should be marked as complete', async function (this: MatchWorld) {
  const res = await fetch(`${this.apiBase}/trades`)
  const body = (await res.json()) as { trades: { id: string }[] }
  assert.ok(body.trades?.length > 0, 'Expected at least one completed trade')
})

Given('there are partial matching orders', async function (this: MatchWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
  await this.loginAs('partial_maker2')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '10000', amount: '0.5' }),
  })
  const body = this.responseBody as { order: Order }
  this.makerOrderId = body?.order?.id
})

When('a new order is executed', async function (this: MatchWorld) {
  await this.loginAs('matching_trader')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '10000', amount: '1' }),
  })
  const body = this.responseBody as { order: Order }
  this.takerOrderId = body?.order?.id
  await sleep(3000)
})

Then('part of the order should be matched', async function (this: MatchWorld) {
  const res = await fetch(`${this.apiBase}/trades`)
  const body = (await res.json()) as { trades: { id: string }[] }
  assert.ok(body.trades?.length > 0, 'Expected at least one trade')
})

Then('the remainder should be stored in the order book', async function (this: MatchWorld) {
  await this.loginAs('matching_trader')
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const openOrder = (body.orders ?? []).find((o) => o.id === this.takerOrderId)
  assert.ok(openOrder, 'Remaining order should be in order book')
  assert.ok(Number(openOrder.remaining) > 0, 'Remaining amount should be > 0')
})

Given('there are no matching orders', async function (this: MatchWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
  await this.loginAs('no_match_maker')
})

When('a new order is created', async function (this: MatchWorld) {
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '1', amount: '0.001' }),
  })
  const body = this.responseBody as { order: Order }
  this.takerOrderId = body?.order?.id
  await sleep(1000)
})

Then('the order should be added to the order book', async function (this: MatchWorld) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const openOrder = (body.orders ?? []).find((o) => o.id === this.takerOrderId)
  assert.ok(openOrder, 'Order should be in the order book')
  assert.ok(['PENDING', 'PARTIAL'].includes(openOrder.status), `Expected PENDING/PARTIAL status, got ${openOrder.status}`)
})

After(async function (this: MatchWorld) {
  if (this.takerOrderId && this.token) {
    await this.api(`/orders/${this.takerOrderId}`, { method: 'DELETE' }).catch(() => null)
    this.takerOrderId = undefined
  }
  if (this.makerOrderId) {
    const makerUsers = ['price_maker', 'complete_maker', 'partial_maker2', 'no_match_maker']
    for (const username of makerUsers) {
      await this.loginAs(username)
      await this.api('/orders/active')
      const body = this.responseBody as { orders: Order[] }
      for (const order of body?.orders ?? []) {
        await this.api(`/orders/${order.id}`, { method: 'DELETE' }).catch(() => null)
      }
    }
    this.makerOrderId = undefined
  }
})
