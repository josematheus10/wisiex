import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'
import type { MarketStats } from '@wisiex/shared'
import type { Order } from '@wisiex/shared'

type StatsWorld = WisiexWorld & { stats?: MarketStats }

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

Given('there are trades in the last 24 hours', async function (this: StatsWorld) {
  await this.loginAs('stats_trader')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '10000', amount: '0.01' }),
  })
  const makerBody = this.responseBody as { order: Order }
  const makerId = makerBody?.order?.id

  await this.loginAs('trades_other2_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '10000', amount: '0.01' }),
  })

  await sleep(2000)

  if (makerId) {
    await this.loginAs('stats_trader')
    await this.api(`/orders/${makerId}`, { method: 'DELETE' }).catch(() => null)
  }
})

When('the user accesses the statistics section', async function (this: StatsWorld) {
  const res = await fetch(`${this.apiBase}/stats`)
  const body = (await res.json()) as { stats: MarketStats }
  this.stats = body.stats
})

Then('the last price should be displayed', function (this: StatsWorld) {
  assert.ok(this.stats, 'Stats should be present')
  assert.ok(this.stats!.lastPrice !== null, 'Last price should not be null')
})

Then('the BTC volume should be displayed', function (this: StatsWorld) {
  assert.ok(this.stats?.volume24hBtc !== undefined, 'BTC volume should be present')
})

Then('the USD volume should be displayed', function (this: StatsWorld) {
  assert.ok(this.stats?.volume24hUsd !== undefined, 'USD volume should be present')
})

Then('the high price should be displayed', function (this: StatsWorld) {
  assert.ok(this.stats?.high24h !== null && this.stats?.high24h !== undefined, 'High price should be present')
})

Then('the low price should be displayed', function (this: StatsWorld) {
  assert.ok(this.stats?.low24h !== null && this.stats?.low24h !== undefined, 'Low price should be present')
})

Given('the user is logged in', async function (this: StatsWorld) {
  await this.loginAs('stats_trader')
})

When('the user views statistics', async function (this: StatsWorld) {
  await this.api('/me')
})

Then('the USD balance should be displayed', function (this: StatsWorld) {
  const body = this.responseBody as { usdBalance: string }
  assert.ok(body?.usdBalance !== undefined, 'USD balance should be present')
})

Then('the BTC balance should be displayed', function (this: StatsWorld) {
  const body = this.responseBody as { btcBalance: string }
  assert.ok(body?.btcBalance !== undefined, 'BTC balance should be present')
})
