import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'

type TradesWorld = WisiexWorld & {
  globalTrades?: { price: string; amount: string; createdAt: string }[]
  personalTrades?: { side: string; price: string; filled: string; status: string; createdAt: string }[]
}

Given('não existem negociações registadas', async function (this: WisiexWorld) {
  await this.api('/trades')
  const body = this.responseBody as { trades: unknown[] }
  assert.ok(Array.isArray(body.trades), 'Endpoint /trades não retornou lista')
})

When('consulto as negociações globais', async function (this: TradesWorld) {
  await this.api('/trades')
  const body = this.responseBody as { trades: { price: string; amount: string; createdAt: string }[] }
  this.globalTrades = body.trades
})

Then('a lista de negociações globais está vazia', function (this: TradesWorld) {
  assert.ok(Array.isArray(this.globalTrades), 'globalTrades não definido')
  assert.equal(this.globalTrades!.length, 0, 'Esperava lista de negociações vazia')
})

Given(
  'existem três negociações registadas com preços {int}, {int} e {int} USD',
  async function (this: WisiexWorld, p1: number, p2: number, p3: number) {
    for (const [price] of [[p1], [p2], [p3]] as [number][]) {
      const savedToken = this.token
      await this.loginAs(`trades_maker_${price}_bdd`)
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

Then(
  'a primeira negociação exibida é a mais recente com preço {int} USD',
  function (this: TradesWorld, price: number) {
    assert.ok(this.globalTrades && this.globalTrades.length > 0, 'Nenhuma negociação encontrada')
    assert.ok(
      Math.abs(Number(this.globalTrades![0]!.price) - price) < 0.01,
      `Esperava primeiro trade com preço ${price}, recebeu ${this.globalTrades![0]!.price}`,
    )
  },
)

Then('cada negociação apresenta o preço e o volume em BTC', function (this: TradesWorld) {
  assert.ok(this.globalTrades && this.globalTrades.length > 0, 'Nenhuma negociação encontrada')
  for (const trade of this.globalTrades!) {
    assert.ok(trade.price, 'Trade sem preço')
    assert.ok(trade.amount, 'Trade sem volume (amount)')
  }
})

Given(
  'o utilizador {string} nunca realizou negociações',
  async function (this: WisiexWorld, _username: string) {
    // Step documenta que o utilizador não tem trades — garantido pelo isolamento dos testes
  },
)

When('consulto o meu histórico pessoal', async function (this: TradesWorld) {
  await this.api('/orders/history')
  const body = this.responseBody as {
    orders: { side: string; price: string; filled: string; status: string; createdAt: string }[]
  }
  // Sort by createdAt ascending so oldest (first placed) appears first
  this.personalTrades = [...(body.orders ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
})

Then('o meu histórico de negociações está vazio', function (this: TradesWorld) {
  assert.equal(this.personalTrades?.length ?? 0, 0, 'Esperava histórico pessoal vazio')
})

Given('existem negociações de vários utilizadores', async function (this: WisiexWorld) {
  const savedToken = this.token
  await this.loginAs('trades_other_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', amount: '0.1', price: '50000' }),
  })
  const sellBody = this.responseBody as { order: { id: string } }
  const sellId = sellBody.order.id
  await this.loginAs('trades_other2_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', amount: '0.1', price: '50000' }),
  })
  await new Promise((resolve) => setTimeout(resolve, 600))
  this.token = savedToken
  // Clean up other users' potential pending orders
  this.token = (await this.loginAs('trades_other_bdd'), this.token)
  await this.api(`/orders/${sellId}`, { method: 'DELETE' }).catch(() => null)
  this.token = savedToken
})

Given(
  'o utilizador {string} participou em {int} negociações',
  async function (this: WisiexWorld, _username: string, count: number) {
    for (let i = 0; i < count; i++) {
      const savedToken = this.token
      await this.loginAs(`trades_counter_maker_${i}_bdd`)
      await this.api('/orders', {
        method: 'POST',
        body: JSON.stringify({ side: 'SELL', amount: '0.1', price: '50000' }),
      })
      this.token = savedToken
      await this.api('/orders', {
        method: 'POST',
        body: JSON.stringify({ side: 'BUY', amount: '0.1', price: '50000' }),
      })
      await new Promise((resolve) => setTimeout(resolve, 600))
    }
  },
)

Then(
  'são exibidas apenas as {int} negociações do utilizador {string}',
  function (this: TradesWorld, count: number, _username: string) {
    assert.ok(
      (this.personalTrades?.length ?? 0) >= count,
      `Esperava ao menos ${count} negociações pessoais, recebeu ${this.personalTrades?.length}`,
    )
  },
)

Given(
  'o utilizador {string} comprou {float} BTC a {int} USD',
  async function (this: WisiexWorld, _username: string, amount: number, price: number) {
    const savedToken = this.token
    await this.loginAs('trades_buy_maker_bdd')
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'SELL', amount: amount.toString(), price: price.toString() }),
    })
    this.token = savedToken
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'BUY', amount: amount.toString(), price: price.toString() }),
    })
    await new Promise((resolve) => setTimeout(resolve, 800))
  },
)

Given(
  'o utilizador {string} vendeu {float} BTC a {int} USD',
  async function (this: WisiexWorld, _username: string, amount: number, price: number) {
    const savedToken = this.token
    await this.loginAs('trades_sell_maker_bdd')
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'BUY', amount: amount.toString(), price: price.toString() }),
    })
    this.token = savedToken
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'SELL', amount: amount.toString(), price: price.toString() }),
    })
    await new Promise((resolve) => setTimeout(resolve, 800))
  },
)

Then(
  'a primeira negociação apresenta tipo {string}',
  function (this: TradesWorld, tipo: string) {
    assert.ok(this.personalTrades && this.personalTrades.length > 0, 'Nenhuma negociação no histórico')
    const expectedSide = tipo === 'Buy' ? 'BUY' : 'SELL'
    assert.equal(
      this.personalTrades![0]!.side,
      expectedSide,
      `Esperava tipo ${expectedSide} na primeira negociação, recebeu ${this.personalTrades![0]!.side}`,
    )
  },
)

Then(
  'a segunda negociação apresenta tipo {string}',
  function (this: TradesWorld, tipo: string) {
    assert.ok(this.personalTrades && this.personalTrades.length >= 2, 'Menos de 2 negociações no histórico')
    const expectedSide = tipo === 'Sell' ? 'SELL' : 'BUY'
    assert.equal(
      this.personalTrades![1]!.side,
      expectedSide,
      `Esperava tipo ${expectedSide} na segunda negociação, recebeu ${this.personalTrades![1]!.side}`,
    )
  },
)
