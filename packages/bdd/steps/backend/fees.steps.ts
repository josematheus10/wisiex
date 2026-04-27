import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'
import type { Order } from '@wisiex/shared'

type FeesWorld = WisiexWorld & {
  makerOrderId?: string
  takerOrderId?: string
  makerUsername?: string
  takerUsername?: string
  feeWalletMakerUser?: string
  feeWalletTakerUser?: string
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

Given('the exchange fee wallet balance is {int} USD and {int} BTC', async function (this: FeesWorld, _usd: number, _btc: number) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
})

Given('a trade of {int} BTC at {int} USD is executed', async function (this: FeesWorld, amount: number, price: number) {
  const makerUser = 'fee_wallet_maker_bdd'
  const takerUser = 'fee_wallet_taker_bdd'
  this.feeWalletMakerUser = makerUser
  this.feeWalletTakerUser = takerUser
  await this.loginAs(makerUser)
  await this.api(`/test/users/${makerUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: String(amount + 1), usdBalance: '0' }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: String(price), amount: String(amount) }),
  })
  await this.loginAs(takerUser)
  await this.api(`/test/users/${takerUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: String(amount * price + 100) }),
  })
})

Given('the taker fee is {float} percent', function (this: FeesWorld, _percent: number) {
})

Given('the maker fee is {float} percent', function (this: FeesWorld, _percent: number) {
})

Then('{float} BTC should be collected as taker fee', async function (this: FeesWorld, expectedFee: number) {
  const res = await fetch(`${this.apiBase}/trades`)
  const body = (await res.json()) as { trades: { takerFee: string }[] }
  const totalTakerFee = (body.trades ?? []).reduce((sum, t) => sum + Number(t.takerFee), 0)
  assert.ok(
    Math.abs(totalTakerFee - expectedFee) < 0.0001,
    `Expected taker fee ~${expectedFee} BTC, got ${totalTakerFee}`,
  )
})

Then('{float} BTC should be collected as maker fee', async function (this: FeesWorld, expectedFee: number) {
  const res = await fetch(`${this.apiBase}/trades`)
  const body = (await res.json()) as { trades: { makerFee: string }[] }
  const totalMakerFee = (body.trades ?? []).reduce((sum, t) => sum + Number(t.makerFee), 0)
  assert.ok(
    Math.abs(totalMakerFee - expectedFee) < 0.0001,
    `Expected maker fee ~${expectedFee} BTC, got ${totalMakerFee}`,
  )
})

Then('the total {float} BTC should be added to the exchange fee wallet', async function (this: FeesWorld, expectedTotal: number) {
  const res = await fetch(`${this.apiBase}/trades`)
  const body = (await res.json()) as { trades: { makerFee: string; takerFee: string }[] }
  const totalFee = (body.trades ?? []).reduce((sum, t) => sum + Number(t.makerFee) + Number(t.takerFee), 0)
  assert.ok(
    Math.abs(totalFee - expectedTotal) < 0.0001,
    `Expected total fee ~${expectedTotal} BTC in fee wallet, got ${totalFee}`,
  )

  const savedToken = this.token
  await this.loginAs('fee_wallet')
  
  const meRes = await fetch(`${this.apiBase}/me`, {
    headers: { Authorization: `Bearer ${this.token}` },
  })
  const meBody = (await meRes.json()) as { btcBalance: string }
  const feeWalletBalance = Number(meBody.btcBalance)
  
  assert.ok(
    Math.abs(feeWalletBalance - expectedTotal) < 0.0001,
    `Expected fee wallet balance ~${expectedTotal} BTC, got ${feeWalletBalance}`,
  )
  
  this.token = savedToken
})

After(async function (this: FeesWorld) {
  if (!this.token) return
  const savedToken = this.token
  for (const user of [this.feeWalletMakerUser, this.feeWalletTakerUser]) {
    if (!user) continue
    await this.loginAs(user)
    await this.api('/orders/active')
    const body = this.responseBody as { orders: Order[] }
    for (const order of body?.orders ?? []) {
      await this.api(`/orders/${order.id}`, { method: 'DELETE' }).catch(() => null)
    }
  }
  this.token = savedToken
  this.feeWalletMakerUser = undefined
  this.feeWalletTakerUser = undefined
})
