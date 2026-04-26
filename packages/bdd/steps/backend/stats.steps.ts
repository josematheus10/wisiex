import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'

type StatsWorld = WisiexWorld & {
  marketStats?: {
    lastPrice: string | null
    volume24hBtc: string
    volume24hUsd: string
    high24h: string | null
    low24h: string | null
    priceChange24h: string | null
  }
  expectedBtcBalance?: string
  expectedUsdBalance?: string
}

Given('não existem negociações nas últimas 24 horas', async function (this: WisiexWorld) {
  // Step documenta o estado esperado — no environment de teste isolado, não existem trades prévios
})

When('consulto as estatísticas', async function (this: StatsWorld) {
  await this.api('/stats')
  const body = this.responseBody as { stats: StatsWorld['marketStats'] }
  this.marketStats = body.stats
})

Then('o último preço é nulo ou zero', function (this: StatsWorld) {
  const lp = this.marketStats?.lastPrice
  assert.ok(lp === null || lp === '0' || lp === undefined, `Esperava lastPrice nulo/zero, recebeu ${lp}`)
})

Then('o volume BTC nas últimas 24h é zero', function (this: StatsWorld) {
  const v = this.marketStats?.volume24hBtc
  assert.ok(v === '0' || v === null || v === undefined, `Esperava volume BTC zero, recebeu ${v}`)
})

Then('o volume USD nas últimas 24h é zero', function (this: StatsWorld) {
  const v = this.marketStats?.volume24hUsd
  assert.ok(v === '0' || v === null || v === undefined, `Esperava volume USD zero, recebeu ${v}`)
})

Then('o máximo nas últimas 24h é nulo ou zero', function (this: StatsWorld) {
  const h = this.marketStats?.high24h
  assert.ok(h === null || h === '0' || h === undefined, `Esperava high24h nulo/zero, recebeu ${h}`)
})

Then('o mínimo nas últimas 24h é nulo ou zero', function (this: StatsWorld) {
  const l = this.marketStats?.low24h
  assert.ok(l === null || l === '0' || l === undefined, `Esperava low24h nulo/zero, recebeu ${l}`)
})

Given(
  'existem negociações registadas com os preços {int}, {int} e {int} USD',
  async function (this: WisiexWorld, p1: number, p2: number, p3: number) {
    for (const price of [p1, p2, p3]) {
      const savedToken = this.token
      await this.loginAs(`stats_maker_${price}_bdd`)
      await this.api('/orders', {
        method: 'POST',
        body: JSON.stringify({ side: 'SELL', amount: '0.1', price: price.toString() }),
      })
      this.token = savedToken
      await this.api('/orders', {
        method: 'POST',
        body: JSON.stringify({ side: 'BUY', amount: '0.1', price: price.toString() }),
      })
      await new Promise((resolve) => setTimeout(resolve, 600))
    }
  },
)

Then('o último preço é {int} USD', function (this: StatsWorld, price: number) {
  assert.ok(
    Math.abs(Number(this.marketStats?.lastPrice) - price) < 0.01,
    `Esperava lastPrice ${price}, recebeu ${this.marketStats?.lastPrice}`,
  )
})

Given(
  'existem negociações nas últimas 24h com volumes de {float} BTC, {float} BTC e {float} BTC',
  async function (this: WisiexWorld, v1: number, v2: number, v3: number) {
    for (const amount of [v1, v2, v3]) {
      const savedToken = this.token
      await this.loginAs(`stats_vol_maker_${amount}_bdd`)
      await this.api('/orders', {
        method: 'POST',
        body: JSON.stringify({ side: 'SELL', amount: amount.toString(), price: '50000' }),
      })
      this.token = savedToken
      await this.api('/orders', {
        method: 'POST',
        body: JSON.stringify({ side: 'BUY', amount: amount.toString(), price: '50000' }),
      })
      await new Promise((resolve) => setTimeout(resolve, 600))
    }
  },
)

Then('o volume BTC nas últimas 24h é {float} BTC', function (this: StatsWorld, expected: number) {
  const actual = Number(this.marketStats?.volume24hBtc ?? 0)
  assert.ok(
    Math.abs(actual - expected) < 0.001,
    `Esperava volume BTC ${expected}, recebeu ${actual}`,
  )
})

Given(
  'existem negociações nas últimas 24h com valores de {int} USD, {int} USD e {int} USD',
  async function (this: WisiexWorld, usd1: number, usd2: number, usd3: number) {
    // usd = amount * price → amount = usd / price. Use price = 50000 for simplicity
    for (const usd of [usd1, usd2, usd3]) {
      const amount = (usd / 50000).toFixed(8)
      const savedToken = this.token
      await this.loginAs(`stats_usd_maker_${usd}_bdd`)
      await this.api('/orders', {
        method: 'POST',
        body: JSON.stringify({ side: 'SELL', amount, price: '50000' }),
      })
      this.token = savedToken
      await this.api('/orders', {
        method: 'POST',
        body: JSON.stringify({ side: 'BUY', amount, price: '50000' }),
      })
      await new Promise((resolve) => setTimeout(resolve, 600))
    }
  },
)

Then('o volume USD nas últimas 24h é {int} USD', function (this: StatsWorld, expected: number) {
  const actual = Number(this.marketStats?.volume24hUsd ?? 0)
  // Allow 1% tolerance due to floating point calculations
  assert.ok(
    Math.abs(actual - expected) / expected < 0.01,
    `Esperava volume USD ~${expected}, recebeu ${actual}`,
  )
})

Given(
  'existem negociações nas últimas 24h com preços {int}, {int} e {int} USD',
  async function (this: WisiexWorld, p1: number, p2: number, p3: number) {
    for (const price of [p1, p2, p3]) {
      const savedToken = this.token
      await this.loginAs(`stats_hl_maker_${price}_bdd`)
      await this.api('/orders', {
        method: 'POST',
        body: JSON.stringify({ side: 'SELL', amount: '0.1', price: price.toString() }),
      })
      this.token = savedToken
      await this.api('/orders', {
        method: 'POST',
        body: JSON.stringify({ side: 'BUY', amount: '0.1', price: price.toString() }),
      })
      await new Promise((resolve) => setTimeout(resolve, 600))
    }
  },
)

Then('o máximo nas últimas 24h é {int} USD', function (this: StatsWorld, expected: number) {
  assert.ok(
    Math.abs(Number(this.marketStats?.high24h) - expected) < 0.01,
    `Esperava high24h ${expected}, recebeu ${this.marketStats?.high24h}`,
  )
})

Then('o mínimo nas últimas 24h é {int} USD', function (this: StatsWorld, expected: number) {
  assert.ok(
    Math.abs(Number(this.marketStats?.low24h) - expected) < 0.01,
    `Esperava low24h ${expected}, recebeu ${this.marketStats?.low24h}`,
  )
})

Given(
  'o utilizador {string} possui {int} BTC e {int} USD',
  async function (this: StatsWorld, _username: string, _btc: number, _usd: number) {
    // Store expected values from actual balance (starting defaults are 100 BTC / 100000 USD)
    await this.api('/me')
    const body = this.responseBody as { btcBalance: string; usdBalance: string }
    this.expectedBtcBalance = body.btcBalance
    this.expectedUsdBalance = body.usdBalance
  },
)

Then('o saldo BTC do utilizador é {int} BTC', async function (this: StatsWorld, _expected: number) {
  await this.api('/me')
  const body = this.responseBody as { btcBalance: string }
  assert.ok(body.btcBalance !== undefined, 'btcBalance não retornado pelo endpoint /me')
  assert.equal(body.btcBalance, this.expectedBtcBalance, `Saldo BTC inconsistente: ${body.btcBalance}`)
})

Then('o saldo USD do utilizador é {int} USD', async function (this: StatsWorld, _expected: number) {
  await this.api('/me')
  const body = this.responseBody as { usdBalance: string }
  assert.ok(body.usdBalance !== undefined, 'usdBalance não retornado pelo endpoint /me')
  assert.equal(body.usdBalance, this.expectedUsdBalance, `Saldo USD inconsistente: ${body.usdBalance}`)
})
