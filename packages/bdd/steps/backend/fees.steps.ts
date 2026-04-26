import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'
import type { Order } from '@wisiex/shared'

type FeesWorld = WisiexWorld & {
  makerOrderId?: string
  takerOrderId?: string
  makerUsername?: string
  takerUsername?: string
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForTrade(world: FeesWorld, orderId: string, maxWait = 5000): Promise<{ makerFee: string; takerFee: string } | null> {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    const res = await fetch(`${world.apiBase}/trades`)
    const body = (await res.json()) as { trades: { id: string; makerFee: string; takerFee: string }[] }
    const trade = (body.trades ?? []).find(() => true)
    if (trade) return trade
    await sleep(300)
  }
  return null
}

Given('an order exists in the order book', async function (this: FeesWorld) {
  this.makerUsername = 'fee_maker'
  await this.loginAs(this.makerUsername)
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '10000', amount: '1' }),
  })
  const body = this.responseBody as { order: Order }
  this.makerOrderId = body?.order?.id
})

When('it is matched by another order', async function (this: FeesWorld) {
  this.takerUsername = 'fee_taker'
  await this.loginAs(this.takerUsername)
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '10000', amount: '1' }),
  })
  const body = this.responseBody as { order: Order }
  this.takerOrderId = body?.order?.id
  await sleep(2000)
})

Then('a 0.5 percent maker fee should be applied', async function (this: FeesWorld) {
  const res = await fetch(`${this.apiBase}/trades`)
  const body = (await res.json()) as { trades: { makerFee: string; amount: string }[] }
  const trade = body.trades?.[0]
  assert.ok(trade, 'Expected at least one trade')
  const expectedFee = Number(trade.amount) * 0.005
  assert.ok(
    Math.abs(Number(trade.makerFee) - expectedFee) < 0.0001,
    `Expected maker fee ~${expectedFee}, got ${trade.makerFee}`,
  )
})

Given('a new order matches an existing order', async function (this: FeesWorld) {
  this.makerUsername = 'fee_maker2'
  await this.loginAs(this.makerUsername)
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '10000', amount: '1' }),
  })
  const body = this.responseBody as { order: Order }
  this.makerOrderId = body?.order?.id
})

When('the trade is executed', async function (this: FeesWorld) {
  this.takerUsername = 'fee_taker2'
  await this.loginAs(this.takerUsername)
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '10000', amount: '1' }),
  })
  const body = this.responseBody as { order: Order }
  this.takerOrderId = body?.order?.id
  await sleep(2000)
})

Then('a 0.3 percent taker fee should be applied', async function (this: FeesWorld) {
  const res = await fetch(`${this.apiBase}/trades`)
  const body = (await res.json()) as { trades: { takerFee: string; amount: string }[] }
  const trade = body.trades?.[0]
  assert.ok(trade, 'Expected at least one trade')
  const expectedFee = Number(trade.amount) * 0.003
  assert.ok(
    Math.abs(Number(trade.takerFee) - expectedFee) < 0.0001,
    `Expected taker fee ~${expectedFee}, got ${trade.takerFee}`,
  )
})
