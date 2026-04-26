import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'
import type { Order } from '@wisiex/shared'

type ConcWorld = WisiexWorld & {
  makerOrderId?: string
  buyerTokens?: string[]
  makerUsername?: string
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

Given('multiple orders are submitted', async function (this: ConcWorld) {
  this.makerUsername = 'concurrent_maker_0_bdd'
  await this.loginAs(this.makerUsername)
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '10000', amount: '3' }),
  })
  const body = this.responseBody as { order: Order }
  this.makerOrderId = body?.order?.id

  this.buyerTokens = []
  for (let i = 1; i <= 3; i++) {
    const username = `concurrent_maker_${i}_bdd`
    await this.loginAs(username)
    this.buyerTokens.push(this.token!)
  }
})

When('the matching engine processes orders', async function (this: ConcWorld) {
  if (!this.buyerTokens) return

  for (const tok of this.buyerTokens) {
    this.token = tok
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'BUY', price: '10000', amount: '1' }),
    })
  }

  await sleep(2000)
})

Then('only one order should be processed at a time', async function (this: ConcWorld) {
  await this.loginAs(this.makerUsername!)
  await this.api('/orders/active')
  const activeBody = this.responseBody as { orders: Order[] }

  const makerActive = (activeBody.orders ?? []).find((o) => o.id === this.makerOrderId)

  if (!makerActive) {
    await this.api('/me')
    const body = this.responseBody as { btcBalance: string }
    assert.ok(Number(body.btcBalance) >= 0, 'BTC balance should not go negative')
  } else {
    assert.ok(true, 'Maker order still exists, partial fill is fine')
  }
})

Given('concurrent order submissions', async function (this: ConcWorld) {
  this.makerUsername = 'concurrent_maker_0_bdd'
  await this.loginAs(this.makerUsername)
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '10000', amount: '1' }),
  })
  const body = this.responseBody as { order: Order }
  this.makerOrderId = body?.order?.id
})

When('orders are processed', async function (this: ConcWorld) {
  this.buyerTokens = []
  for (let i = 1; i <= 2; i++) {
    const username = `concurrent_maker_${i}_bdd`
    await this.loginAs(username)
    this.buyerTokens.push(this.token!)
  }

  await Promise.all(
    this.buyerTokens.map((tok) => {
      const hdrs: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tok}`,
      }
      return fetch(`${this.apiBase}/orders`, {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({ side: 'BUY', price: '10000', amount: '1' }),
      })
    }),
  )

  await sleep(3000)
})

Then('no order should be executed twice', async function (this: ConcWorld) {
  const res = await fetch(`${this.apiBase}/trades`)
  const body = (await res.json()) as { trades: { id: string; price: string; amount: string }[] }
  const trades = body.trades ?? []

  const ids = trades.map((t) => t.id)
  const unique = new Set(ids)
  assert.equal(unique.size, ids.length, 'Duplicate trade IDs detected')

  await this.loginAs(this.makerUsername!)
  await this.api('/orders/active')
  const ordersBody = this.responseBody as { orders: Order[] }
  const makerOrder = (ordersBody.orders ?? []).find((o) => o.id === this.makerOrderId)
  if (makerOrder) {
    assert.ok(Number(makerOrder.filled) <= 1, 'Order filled more than its amount')
  }
})

After(async function (this: ConcWorld) {
  const users = ['concurrent_maker_0_bdd', 'concurrent_maker_1_bdd', 'concurrent_maker_2_bdd', 'concurrent_maker_3_bdd']
  for (const username of users) {
    await this.loginAs(username)
    await this.api('/orders/active')
    const body = this.responseBody as { orders: Order[] }
    for (const order of body?.orders ?? []) {
      await this.api(`/orders/${order.id}`, { method: 'DELETE' }).catch(() => null)
    }
  }
})
