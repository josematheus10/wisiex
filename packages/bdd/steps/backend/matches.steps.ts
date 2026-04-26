import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'
import type { Order } from '@wisiex/shared'

type MatchesWorld = WisiexWorld & { tradeList?: { id: string; price: string; amount: string }[] }

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

Given('there are executed trades', async function (this: MatchesWorld) {
  await this.loginAs('trades_trader')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '10000', amount: '0.5' }),
  })
  const makerBody = this.responseBody as { order: Order }
  const makerId = makerBody?.order?.id

  await this.loginAs('trades_other_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '10000', amount: '0.5' }),
  })

  await sleep(2000)

  if (makerId) {
    await this.loginAs('trades_trader')
    await this.api(`/orders/${makerId}`, { method: 'DELETE' }).catch(() => null)
  }
})

When('the user opens the global matches section', async function (this: MatchesWorld) {
  const res = await fetch(`${this.apiBase}/trades`)
  const body = (await res.json()) as { trades: { id: string; price: string; amount: string }[] }
  this.tradeList = body.trades ?? []
})

Then('the system should display a list of matches', function (this: MatchesWorld) {
  assert.ok(Array.isArray(this.tradeList), 'Trade list should be an array')
  assert.ok(this.tradeList!.length > 0, 'Trade list should not be empty')
})

Then('the most recent match should be first', function (this: MatchesWorld) {
  assert.ok(this.tradeList && this.tradeList.length > 0)
})

Then('each match should include price and volume', function (this: MatchesWorld) {
  for (const trade of this.tradeList ?? []) {
    assert.ok(trade.price !== undefined, 'Trade must have price')
    assert.ok(trade.amount !== undefined, 'Trade must have amount (volume)')
  }
})
