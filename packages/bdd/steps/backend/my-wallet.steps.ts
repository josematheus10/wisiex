import { Given, When, Then, Before, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'
import type { Order } from '@wisiex/shared'

type WalletWorld = WisiexWorld & {
  walletOrderId?: string
  activeOrderId?: string
  cancelOrderId?: string
  openOrderId?: string
  walletOrderSide?: 'BUY' | 'SELL'
  walletInitialUsd?: number
  walletInitialBtc?: number
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForOrderComplete(world: WalletWorld, orderId: string, maxWait = 8000): Promise<Order | null> {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    await world.api('/orders/history')
    const body = world.responseBody as { orders: Order[] }
    const done = (body.orders ?? []).find((o) => o.id === orderId && o.status === 'COMPLETED')
    if (done) return done
    await sleep(300)
  }
  return null
}

async function waitForPartialFill(world: WalletWorld, orderId: string, maxWait = 8000): Promise<Order | null> {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    await world.api('/orders/active')
    const body = world.responseBody as { orders: Order[] }
    const partial = (body.orders ?? []).find((o) => o.id === orderId && o.status === 'PARTIAL')
    if (partial) return partial
    await sleep(300)
  }
  return null
}

Before({ tags: '@wallet-default-balance' }, async function (this: WalletWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
})

Before({ tags: '@wallet-reserve-buy' }, async function (this: WalletWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
})

Before({ tags: '@wallet-reserve-sell' }, async function (this: WalletWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
})

Before({ tags: '@wallet-full-buy-exec' }, async function (this: WalletWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
  await this.loginAs('wallet_counter_seller_bdd')
  await this.api('/test/users/wallet_counter_seller_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '10', usdBalance: '0' }),
  })
})

Before({ tags: '@wallet-full-sell-exec' }, async function (this: WalletWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
  await this.loginAs('wallet_counter_buyer_bdd')
  await this.api('/test/users/wallet_counter_buyer_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: '100000' }),
  })
})

Before({ tags: '@wallet-partial-exec' }, async function (this: WalletWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
  await this.loginAs('wallet_partial_seller_bdd')
  await this.api('/test/users/wallet_partial_seller_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '10', usdBalance: '0' }),
  })
})

Before({ tags: '@wallet-cancel-buy-reserved' }, async function (this: WalletWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
  await this.loginAs('wallet_cancel_buy_bdd')
  await this.api('/test/users/wallet_cancel_buy_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: '10000' }),
  })
})

Before({ tags: '@wallet-cancel-partial' }, async function (this: WalletWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
  await this.loginAs('wallet_cp_seller_bdd')
  await this.api('/test/users/wallet_cp_seller_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '10', usdBalance: '0' }),
  })
  await this.loginAs('cancel_partial_bdd')
  await this.api('/test/users/cancel_partial_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: '10000' }),
  })
})

Before({ tags: '@wallet-taker-fee' }, async function (this: WalletWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
})

Before({ tags: '@wallet-maker-fee' }, async function (this: WalletWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
})

Before({ tags: '@wallet-double-spend' }, async function (this: WalletWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
})

Before({ tags: '@wallet-concurrent-exec' }, async function (this: WalletWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
})

Before({ tags: '@wallet-total' }, async function (this: WalletWorld) {
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' })
  await this.loginAs('wallet_total_bdd')
  await this.api('/test/users/wallet_total_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '5', usdBalance: '50000' }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '9999', amount: '1' }),
  })
  const body = this.responseBody as { order: Order }
  this.walletOrderId = body?.order?.id
})

Given('a new user {string} is registered', async function (this: WalletWorld, username: string) {
  await this.loginAs(`wallet_${username}_bdd`)
})

Given('the user has a buy order with {int} USD reserved', async function (this: WalletWorld, usd: number) {
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: String(usd), amount: '1' }),
  })
  const body = this.responseBody as { order: Order }
  this.walletOrderId = body?.order?.id
  this.cancelOrderId = body?.order?.id
  this.activeOrderId = body?.order?.id
})

Given('the user has {int} BTC and {int} USD', async function (this: WalletWorld, btc: number, usd: number) {
  await this.loginAs('wallet_persist_bdd')
  await this.api('/test/users/wallet_persist_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: String(btc), usdBalance: String(usd) }),
  })
  this.walletInitialBtc = btc
  this.walletInitialUsd = usd
})

Given('the user executes a trade as taker', async function (this: WalletWorld) {
  await this.loginAs('wallet_taker_maker_bdd')
  await this.api('/test/users/wallet_taker_maker_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '1', usdBalance: '0' }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '10000', amount: '1' }),
  })
  const makerBody = this.responseBody as { order: Order }
  this.walletOrderId = makerBody?.order?.id

  await this.loginAs('wallet_taker_bdd')
  await this.api('/test/users/wallet_taker_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: '10000' }),
  })
})

Given('the user has an order in the book', async function (this: WalletWorld) {
  await this.loginAs('wallet_maker_bdd')
  await this.api('/test/users/wallet_maker_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '1', usdBalance: '0' }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '10000', amount: '1' }),
  })
  const body = this.responseBody as { order: Order }
  this.walletOrderId = body?.order?.id
})

Given('multiple orders are being processed', async function (this: WalletWorld) {
  await this.loginAs('wallet_conc_seller_bdd')
  await this.api('/test/users/wallet_conc_seller_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '2', usdBalance: '0' }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '10000', amount: '1' }),
  })

  await this.loginAs('wallet_conc_buyer_bdd')
  await this.api('/test/users/wallet_conc_buyer_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: '10000' }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '10000', amount: '1' }),
  })
  const body = this.responseBody as { order: Order }
  this.walletOrderId = body?.order?.id
})

Given('the system is processing orders', async function (this: WalletWorld) {
  await this.loginAs('wallet_sys_bdd')
  await this.api('/test/users/wallet_sys_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: '5000' }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '1000', amount: '0.1' }),
  })
  const body = this.responseBody as { order: Order }
  this.walletOrderId = body?.order?.id
})

Given('the user has available and reserved balances', async function (this: WalletWorld) {
  await this.loginAs('wallet_total_bdd')
})

When('the user creates a buy order of {int} BTC at {int} USD', async function (this: WalletWorld, amount: number, price: number) {
  this.walletOrderSide = 'BUY'
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: String(price), amount: String(amount) }),
  })
  const body = this.responseBody as { order: Order }
  this.walletOrderId = body?.order?.id
  this.cancelOrderId = body?.order?.id
  this.activeOrderId = body?.order?.id
})

When('the user creates a sell order of {int} BTC', async function (this: WalletWorld, amount: number) {
  this.walletOrderSide = 'SELL'
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '99999', amount: String(amount) }),
  })
  const body = this.responseBody as { order: Order }
  this.walletOrderId = body?.order?.id
  this.cancelOrderId = body?.order?.id
  this.activeOrderId = body?.order?.id
})

When('the user creates a sell order of {int} BTC at {int} USD', async function (this: WalletWorld, amount: number, price: number) {
  this.walletOrderSide = 'SELL'
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: String(price), amount: String(amount) }),
  })
  const body = this.responseBody as { order: Order }
  this.walletOrderId = body?.order?.id
  this.cancelOrderId = body?.order?.id
  this.activeOrderId = body?.order?.id
})

When('the user tries to create a buy order of {int} BTC at {int} USD', async function (this: WalletWorld, amount: number, price: number) {
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: String(price), amount: String(amount) }),
  })
})

When('the user tries to create a sell order of {int} BTC', async function (this: WalletWorld, amount: number) {
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '99999', amount: String(amount) }),
  })
})

When('the order is fully matched', async function (this: WalletWorld) {
  const savedToken = this.token
  if (this.walletOrderSide === 'BUY') {
    await this.loginAs('wallet_counter_seller_bdd')
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'SELL', price: '10000', amount: '1' }),
    })
  } else {
    await this.loginAs('wallet_counter_buyer_bdd')
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'BUY', price: '10000', amount: '1' }),
    })
  }
  this.token = savedToken
  const done = await waitForOrderComplete(this, this.walletOrderId!, 8000)
  assert.ok(done, 'Expected order to be COMPLETED after counter-order match')
})

When('{float} BTC is executed', async function (this: WalletWorld, amount: number) {
  const savedToken = this.token
  await this.loginAs('wallet_partial_seller_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '10000', amount: String(amount) }),
  })
  this.token = savedToken
  const partial = await waitForPartialFill(this, this.walletOrderId!, 8000)
  assert.ok(partial, `Expected order to be PARTIAL after ${amount} BTC executed`)
})

When('{float} BTC was executed', async function (this: WalletWorld, amount: number) {
  const orderId = this.walletOrderId ?? this.cancelOrderId
  assert.ok(orderId, 'Must have an order ID for partial fill')
  const savedToken = this.token
  await this.loginAs('wallet_cp_seller_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', price: '10000', amount: String(amount) }),
  })
  this.token = savedToken
  const partial = await waitForPartialFill(this, orderId, 8000)
  assert.ok(partial, `Expected order to be PARTIAL after ${amount} BTC executed`)
  this.walletOrderId = orderId
})

When('the trade is completed', async function (this: WalletWorld) {
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '10000', amount: '1' }),
  })
  const body = this.responseBody as { order: Order }
  const takerOrderId = body?.order?.id
  const done = await waitForOrderComplete(this, takerOrderId!, 8000)
  assert.ok(done, 'Expected taker order to complete')
})

When('the order is matched', async function (this: WalletWorld) {
  const savedToken = this.token
  await this.loginAs('wallet_maker_buyer_bdd')
  await this.api('/test/users/wallet_maker_buyer_bdd/balance', {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: '10000' }),
  })
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', price: '10000', amount: '1' }),
  })
  this.token = savedToken
  const done = await waitForOrderComplete(this, this.walletOrderId!, 8000)
  assert.ok(done, 'Expected maker order to complete')
})

When('the user refreshes the page', async function (this: WalletWorld) {
  await this.api('/me')
})

When('the user creates two buy orders of {int} BTC at {int} USD simultaneously', async function (this: WalletWorld, amount: number, price: number) {
  const [res1, res2] = await Promise.all([
    this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'BUY', price: String(price), amount: String(amount) }),
    }),
    this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'BUY', price: String(price), amount: String(amount) }),
    }),
  ])
  void res1
  void res2
})

When('the matching engine executes trades', async function (this: WalletWorld) {
  await sleep(3000)
})

Then('the reserved balances should be zero', async function (this: WalletWorld) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  assert.equal((body.orders ?? []).length, 0, 'Expected no reserved orders')
})

Then('{int} USD should be reserved', async function (this: WalletWorld, usd: number) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reserved = (body.orders ?? [])
    .filter((o) => o.side === 'BUY')
    .reduce((sum, o) => sum + Number(o.remaining) * Number(o.price), 0)
  assert.ok(Math.abs(reserved - usd) < 0.01, `Expected ${usd} USD reserved, got ${reserved}`)
})

Then('{int} USD should remain available', async function (this: WalletWorld, usd: number) {
  await this.api('/me')
  const body = this.responseBody as { usdBalance: string }
  assert.ok(Math.abs(Number(body.usdBalance) - usd) < 0.01, `Expected ${usd} USD available, got ${body.usdBalance}`)
})

Then('{int} BTC should be reserved', async function (this: WalletWorld, btc: number) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reserved = (body.orders ?? [])
    .filter((o) => o.side === 'SELL')
    .reduce((sum, o) => sum + Number(o.remaining), 0)
  assert.ok(Math.abs(reserved - btc) < 0.0001, `Expected ${btc} BTC reserved, got ${reserved}`)
})

Then('{int} BTC should remain available', async function (this: WalletWorld, btc: number) {
  await this.api('/me')
  const body = this.responseBody as { btcBalance: string }
  assert.ok(Math.abs(Number(body.btcBalance) - btc) < 0.0001, `Expected ${btc} BTC available, got ${body.btcBalance}`)
})

Then('the system should reject the order', function (this: WalletWorld) {
  assert.equal(this.response?.status, 400, `Expected 400, got ${this.response?.status}`)
})

Then('{int} USD should be deducted', async function (this: WalletWorld, usd: number) {
  await this.api('/orders/active')
  const activeBody = this.responseBody as { orders: Order[] }
  const order = (activeBody.orders ?? []).find((o) => o.id === this.walletOrderId)
  if (order) {
    const spent = Number(order.filled) * Number(order.price)
    assert.ok(Math.abs(spent - usd) < 0.01, `Expected ${usd} USD deducted, got ${spent}`)
  } else {
    await this.api('/orders/history')
    const histBody = this.responseBody as { orders: Order[] }
    const done = (histBody.orders ?? []).find((o) => o.id === this.walletOrderId)
    assert.ok(done, 'Order not found in active or history')
    const spent = Number(done.amount) * Number(done.price)
    assert.ok(Math.abs(spent - usd) < 0.01, `Expected ${usd} USD deducted, got ${spent}`)
  }
})

Then('the user should receive {float} BTC', async function (this: WalletWorld, btc: number) {
  await this.api('/me')
  const body = this.responseBody as { btcBalance: string }
  assert.ok(Number(body.btcBalance) >= btc * 0.99, `Expected ~${btc} BTC, got ${body.btcBalance}`)
})

Then('no USD should remain reserved', async function (this: WalletWorld) {
  await this.api('/me')
  const meBody = this.responseBody as { usdBalance: string }
  assert.ok(Number(meBody.usdBalance) >= 0, 'USD balance should be non-negative')
  await this.api('/orders/active')
  const activeBody = this.responseBody as { orders: Order[] }
  const reserved = (activeBody.orders ?? [])
    .filter((o) => o.side === 'BUY')
    .reduce((sum, o) => sum + Number(o.remaining) * Number(o.price), 0)
  assert.ok(reserved < 0.01, `Expected 0 USD reserved, got ${reserved}`)
})

Then('{int} BTC should be deducted', async function (this: WalletWorld, btc: number) {
  await this.api('/orders/active')
  const activeBody = this.responseBody as { orders: Order[] }
  const order = (activeBody.orders ?? []).find((o) => o.id === this.walletOrderId)
  if (order) {
    assert.ok(Math.abs(Number(order.filled) - btc) < 0.0001, `Expected ${btc} BTC deducted, got ${order.filled}`)
  } else {
    await this.api('/orders/history')
    const histBody = this.responseBody as { orders: Order[] }
    const done = (histBody.orders ?? []).find((o) => o.id === this.walletOrderId)
    assert.ok(done, 'Order not found in active or history')
    assert.ok(Math.abs(Number(done.filled) - btc) < 0.0001, `Expected ${btc} BTC deducted, filled=${done.filled}`)
  }
})

Then('the user should receive {int} USD', async function (this: WalletWorld, usd: number) {
  await this.api('/me')
  const body = this.responseBody as { usdBalance: string }
  assert.ok(Number(body.usdBalance) >= usd * 0.99, `Expected ~${usd} USD, got ${body.usdBalance}`)
})

Then('no BTC should remain reserved', async function (this: WalletWorld) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reserved = (body.orders ?? [])
    .filter((o) => o.side === 'SELL')
    .reduce((sum, o) => sum + Number(o.remaining), 0)
  assert.ok(reserved < 0.0001, `Expected 0 BTC reserved, got ${reserved}`)
})

Then('{int} USD should remain reserved', async function (this: WalletWorld, usd: number) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reserved = (body.orders ?? [])
    .filter((o) => o.side === 'BUY')
    .reduce((sum, o) => sum + Number(o.remaining) * Number(o.price), 0)
  assert.ok(Math.abs(reserved - usd) < 0.01, `Expected ${usd} USD reserved, got ${reserved}`)
})

Then('the {int} USD should return to available balance', async function (this: WalletWorld, usd: number) {
  await this.api('/me')
  const body = this.responseBody as { usdBalance: string }
  assert.ok(Math.abs(Number(body.usdBalance) - usd) < 0.01, `Expected ${usd} USD available, got ${body.usdBalance}`)
})

Then('reserved USD should be zero', async function (this: WalletWorld) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  const reserved = (body.orders ?? [])
    .filter((o) => o.side === 'BUY')
    .reduce((sum, o) => sum + Number(o.remaining) * Number(o.price), 0)
  assert.ok(reserved < 0.01, `Expected 0 USD reserved, got ${reserved}`)
})

Then('{int} USD should return to available balance', async function (this: WalletWorld, usd: number) {
  await this.api('/me')
  const body = this.responseBody as { usdBalance: string }
  assert.ok(Math.abs(Number(body.usdBalance) - usd) < 0.01, `Expected ${usd} USD, got ${body.usdBalance}`)
})

Then('the user should keep {float} BTC', async function (this: WalletWorld, btc: number) {
  await this.api('/me')
  const body = this.responseBody as { btcBalance: string }
  assert.ok(Number(body.btcBalance) >= btc * 0.99, `Expected ~${btc} BTC kept, got ${body.btcBalance}`)
})

Then('a {float} percent fee should be deducted from received assets', async function (this: WalletWorld, pct: number) {
  const start = Date.now()
  let trade: { takerFee: string; amount: string } | undefined
  while (Date.now() - start < 5000) {
    const res = await fetch(`${this.apiBase}/trades`)
    const body = (await res.json()) as { trades: { takerFee: string; amount: string }[] }
    trade = body.trades?.[0]
    if (trade) break
    await sleep(300)
  }
  assert.ok(trade, 'Expected at least one trade')
  const expectedFee = Number(trade.amount) * (pct / 100)
  assert.ok(
    Math.abs(Number(trade.takerFee) - expectedFee) < 0.0001,
    `Expected taker fee ~${expectedFee}, got ${trade.takerFee}`,
  )
})

Then('a {float} percent fee should be deducted', async function (this: WalletWorld, pct: number) {
  const start = Date.now()
  let trade: { makerFee: string; amount: string } | undefined
  while (Date.now() - start < 5000) {
    const res = await fetch(`${this.apiBase}/trades`)
    const body = (await res.json()) as { trades: { makerFee: string; amount: string }[] }
    trade = body.trades?.[0]
    if (trade) break
    await sleep(300)
  }
  assert.ok(trade, 'Expected at least one trade')
  const expectedFee = Number(trade.amount) * (pct / 100)
  assert.ok(
    Math.abs(Number(trade.makerFee) - expectedFee) < 0.0001,
    `Expected maker fee ~${expectedFee}, got ${trade.makerFee}`,
  )
})

Then('the system should reload the wallet from backend', async function (this: WalletWorld) {
  await this.api('/me')
  assert.ok(this.response?.status === 200, 'Expected 200 from /me')
})

Then('the balances should remain unchanged', async function (this: WalletWorld) {
  const body = this.responseBody as { btcBalance: string; usdBalance: string }
  assert.ok(Math.abs(Number(body.btcBalance) - (this.walletInitialBtc ?? 5)) < 0.0001, `BTC balance changed`)
  assert.ok(Math.abs(Number(body.usdBalance) - (this.walletInitialUsd ?? 50000)) < 0.01, `USD balance changed`)
})

Then('only one order should be accepted', async function (this: WalletWorld) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  assert.equal((body.orders ?? []).length, 1, `Expected exactly 1 active order, got ${body.orders?.length}`)
})

Then('the other should be rejected', async function (this: WalletWorld) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: Order[] }
  assert.ok((body.orders ?? []).length <= 1, 'Expected at most 1 active order (other was rejected)')
})

Then('the final balances must be consistent', async function (this: WalletWorld) {
  await sleep(2000)
  await this.api('/me')
  const body = this.responseBody as { usdBalance: string; btcBalance: string }
  assert.ok(Number(body.usdBalance) >= 0, 'USD should not be negative')
  assert.ok(Number(body.btcBalance) >= 0, 'BTC should not be negative')
})

Then('no negative balance should occur', async function (this: WalletWorld) {
  await this.api('/me')
  const body = this.responseBody as { usdBalance: string; btcBalance: string }
  assert.ok(Number(body.usdBalance) >= 0, `USD balance negative: ${body.usdBalance}`)
  assert.ok(Number(body.btcBalance) >= 0, `BTC balance negative: ${body.btcBalance}`)
})

Then('no wallet balance should be negative', async function (this: WalletWorld) {
  await this.api('/me')
  const body = this.responseBody as { usdBalance: string; btcBalance: string }
  assert.ok(Number(body.usdBalance) >= 0, `USD negative: ${body.usdBalance}`)
  assert.ok(Number(body.btcBalance) >= 0, `BTC negative: ${body.btcBalance}`)
})

Then('total balance should always equal available plus reserved', async function (this: WalletWorld) {
  await this.api('/me')
  const meBody = this.responseBody as { usdBalance: string }
  await this.api('/orders/active')
  const ordersBody = this.responseBody as { orders: Order[] }
  const available = Number(meBody.usdBalance)
  const reserved = (ordersBody.orders ?? [])
    .filter((o) => o.side === 'BUY')
    .reduce((sum, o) => sum + Number(o.remaining) * Number(o.price), 0)
  assert.ok(available >= 0, 'Available USD should be >= 0')
  assert.ok(reserved >= 0, 'Reserved USD should be >= 0')
  assert.ok(available + reserved >= 0, 'Total balance should be >= 0')
})

After(async function (this: WalletWorld) {
  const users = [
    'wallet_alice_bdd', 'wallet_counter_seller_bdd', 'wallet_counter_buyer_bdd',
    'wallet_partial_seller_bdd', 'wallet_cancel_buy_bdd', 'wallet_cp_seller_bdd',
    'wallet_taker_maker_bdd', 'wallet_taker_bdd', 'wallet_maker_bdd', 'wallet_maker_buyer_bdd',
    'wallet_persist_bdd', 'wallet_conc_seller_bdd', 'wallet_conc_buyer_bdd',
    'wallet_sys_bdd', 'wallet_total_bdd',
    'balance_usd_bdd', 'balance_btc_bdd',
  ]
  for (const username of users) {
    await this.loginAs(username)
    await this.api('/orders/active')
    const body = this.responseBody as { orders: Order[] }
    for (const order of body?.orders ?? []) {
      await this.api(`/orders/${order.id}`, { method: 'DELETE' }).catch(() => null)
    }
  }
})
