import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'

type FeesWorld = WisiexWorld & {
  takerBalanceBefore?: { btcBalance: string; usdBalance: string }
  makerBalanceBefore?: { btcBalance: string; usdBalance: string }
  takerUsername?: string
  makerUsername?: string
}

async function getBalance(world: WisiexWorld): Promise<{ btcBalance: string; usdBalance: string }> {
  await world.api('/me')
  return world.responseBody as { btcBalance: string; usdBalance: string }
}

Given(
  'o utilizador {string} tem uma ordem de venda de {float} BTC a {int} USD',
  async function (this: FeesWorld, username: string, amount: number, price: number) {
    const savedToken = this.token
    this.makerUsername = username
    await this.loginAs(username)
    this.makerBalanceBefore = await getBalance(this)
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'SELL', amount: amount.toString(), price: price.toString() }),
    })
    assert.ok(this.response?.ok, `Falha ao criar ordem de venda do maker ${username}`)
    this.token = savedToken
    this.takerBalanceBefore = await getBalance(this)
  },
)

Given(
  'o utilizador {string} tem uma ordem de compra de {float} BTC a {int} USD no livro',
  async function (this: FeesWorld, username: string, amount: number, price: number) {
    const savedToken = this.token
    this.makerUsername = username
    await this.loginAs(username)
    this.makerBalanceBefore = await getBalance(this)
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'BUY', amount: amount.toString(), price: price.toString() }),
    })
    assert.ok(this.response?.ok, `Falha ao criar ordem de compra do maker ${username}`)
    this.token = savedToken
    this.takerBalanceBefore = await getBalance(this)
  },
)

When(
  'o utilizador {string} coloca uma ordem de venda de {float} BTC a {int} USD',
  async function (this: FeesWorld, username: string, amount: number, price: number) {
    const savedToken = this.token
    this.takerUsername = username
    await this.loginAs(username)
    this.takerBalanceBefore = await getBalance(this)
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'SELL', amount: amount.toString(), price: price.toString() }),
    })
    assert.ok(this.response?.ok, `Falha ao criar ordem de venda do taker ${username}`)
    this.token = savedToken
    await new Promise((resolve) => setTimeout(resolve, 1000))
  },
)

Then('a taxa do taker corresponde a {float}% do volume negociado', async function (
  this: FeesWorld,
  _feePercent: number,
) {
  await this.api('/trades')
  const body = this.responseBody as { trades: { takerFee: string; amount: string }[] }
  assert.ok(body.trades.length > 0, 'Nenhuma negociação encontrada')
  const trade = body.trades[0]!
  const expectedFee = Number(trade.amount) * 0.003
  assert.ok(
    Math.abs(Number(trade.takerFee) - expectedFee) < 0.0001,
    `Taker fee esperada: ${expectedFee}, recebida: ${trade.takerFee}`,
  )
})

Then(
  /^o taker recebe ([\d.]+) BTC \(deduzida a taxa de [\d.]+%\)$/,
  async function (this: FeesWorld, expectedBtcStr: string) {
    const expectedBtc = Number(expectedBtcStr)
    await this.api('/me')
    const body = this.responseBody as { btcBalance: string }
    const before = Number(this.takerBalanceBefore?.btcBalance ?? 100)
    const actual = Number(body.btcBalance)
    assert.ok(
      Math.abs(actual - before - expectedBtc) < 0.001,
      `Taker deveria ter recebido ~${expectedBtc} BTC (antes: ${before}, depois: ${actual})`,
    )
  },
)

Then('a taxa do maker corresponde a {float}% do volume negociado', async function (
  this: FeesWorld,
  _feePercent: number,
) {
  await this.api('/trades')
  const body = this.responseBody as { trades: { makerFee: string; amount: string }[] }
  assert.ok(body.trades.length > 0, 'Nenhuma negociação encontrada')
  const trade = body.trades[0]!
  const expectedFee = Number(trade.amount) * 0.005
  assert.ok(
    Math.abs(Number(trade.makerFee) - expectedFee) < 0.0001,
    `Maker fee esperada: ${expectedFee}, recebida: ${trade.makerFee}`,
  )
})

Then(
  /^o maker recebe (\d+) USD \(deduzida a taxa de [\d.]+% sobre \d+ USD\)$/,
  async function (this: FeesWorld, expectedUsdStr: string) {
    const expectedUsd = Number(expectedUsdStr)
    if (!this.makerUsername) return
    const savedToken = this.token
    await this.loginAs(this.makerUsername)
    await this.api('/me')
    const body = this.responseBody as { usdBalance: string }
    const before = Number(this.makerBalanceBefore?.usdBalance ?? 100000)
    const actual = Number(body.usdBalance)
    this.token = savedToken
    assert.ok(
      Math.abs(actual - before - expectedUsd) < 1,
      `Maker deveria ter recebido ~${expectedUsd} USD (antes: ${before}, depois: ${actual})`,
    )
  },
)

Then(
  'a taxa do taker deduzida ao vendedor corresponde a {float}% do valor em USD',
  async function (this: FeesWorld, _feePercent: number) {
    await this.api('/trades')
    const body = this.responseBody as { trades: { takerFee: string; amount: string; price: string }[] }
    assert.ok(body.trades.length > 0, 'Nenhuma negociação encontrada')
    const trade = body.trades[0]!
    const expectedFee = Number(trade.amount) * 0.003
    assert.ok(
      Math.abs(Number(trade.takerFee) - expectedFee) < 0.0001,
      `Taker fee esperada: ${expectedFee}, recebida: ${trade.takerFee}`,
    )
  },
)

Then(
  /^o vendedor recebe (\d+) USD \(deduzida a taxa de [\d.]+% sobre \d+ USD\)$/,
  async function (this: FeesWorld, expectedUsdStr: string) {
    const expectedUsd = Number(expectedUsdStr)
    if (!this.takerUsername) return
    const savedToken = this.token
    await this.loginAs(this.takerUsername)
    await this.api('/me')
    const body = this.responseBody as { usdBalance: string }
    const before = Number(this.takerBalanceBefore?.usdBalance ?? 100000)
    const actual = Number(body.usdBalance)
    this.token = savedToken
    assert.ok(
      Math.abs(actual - before - expectedUsd) < 1,
      `Vendedor deveria ter recebido ~${expectedUsd} USD (antes: ${before}, depois: ${actual})`,
    )
  },
)

Then(
  'a taxa do maker deduzida ao comprador corresponde a {float}% do volume em BTC',
  async function (this: FeesWorld, _feePercent: number) {
    await this.api('/trades')
    const body = this.responseBody as { trades: { makerFee: string; amount: string }[] }
    assert.ok(body.trades.length > 0, 'Nenhuma negociação encontrada')
    const trade = body.trades[0]!
    const expectedFee = Number(trade.amount) * 0.005
    assert.ok(
      Math.abs(Number(trade.makerFee) - expectedFee) < 0.0001,
      `Maker fee esperada: ${expectedFee}, recebida: ${trade.makerFee}`,
    )
  },
)

Then(
  /^o comprador recebe ([\d.]+) BTC \(deduzida a taxa de [\d.]+%\)$/,
  async function (this: FeesWorld, expectedBtcStr: string) {
    const expectedBtc = Number(expectedBtcStr)
    if (!this.makerUsername) return
    const savedToken = this.token
    await this.loginAs(this.makerUsername)
    await this.api('/me')
    const body = this.responseBody as { btcBalance: string }
    const before = Number(this.makerBalanceBefore?.btcBalance ?? 100)
    const actual = Number(body.btcBalance)
    this.token = savedToken
    assert.ok(
      Math.abs(actual - before - expectedBtc) < 0.001,
      `Comprador deveria ter recebido ~${expectedBtc} BTC (antes: ${before}, depois: ${actual})`,
    )
  },
)

Then('{float} BTC são casados', async function (this: WisiexWorld, amount: number) {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await this.api('/trades')
  const body = this.responseBody as { trades: { amount: string }[] }
  assert.ok(body.trades.length > 0, 'Nenhuma negociação encontrada')
  const totalTraded = body.trades.reduce((sum, t) => sum + Number(t.amount), 0)
  assert.ok(
    Math.abs(totalTraded - amount) < 0.001,
    `Esperava ${amount} BTC negociados, recebeu ${totalTraded}`,
  )
})

Then(
  'a taxa do taker incide apenas sobre os {float} BTC negociados',
  async function (this: WisiexWorld, amount: number) {
    await this.api('/trades')
    const body = this.responseBody as { trades: { takerFee: string; amount: string }[] }
    assert.ok(body.trades.length > 0, 'Nenhuma negociação encontrada')
    const trade = body.trades[0]!
    const expectedFee = amount * 0.003
    assert.ok(
      Math.abs(Number(trade.takerFee) - expectedFee) < 0.0001,
      `Taker fee parcial esperada: ${expectedFee}, recebida: ${trade.takerFee}`,
    )
  },
)

Then(
  'a taxa do maker incide apenas sobre os {int} USD negociados',
  async function (this: WisiexWorld, _usdValue: number) {
    await this.api('/trades')
    const body = this.responseBody as { trades: { makerFee: string; amount: string; price: string }[] }
    assert.ok(body.trades.length > 0, 'Nenhuma negociação encontrada')
    const trade = body.trades[0]!
    const expectedFee = Number(trade.amount) * 0.005
    assert.ok(
      Math.abs(Number(trade.makerFee) - expectedFee) < 0.0001,
      `Maker fee parcial esperada`,
    )
  },
)
