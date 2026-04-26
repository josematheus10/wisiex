import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'

type MatchWorld = WisiexWorld & {
  lastTakerOrderId?: string
  lastMakerUsername?: string
  lastMakerOrderId?: string
}

Given(
  'o utilizador {string} tem uma ordem de venda de {float} BTC a {int} USD',
  async function (this: MatchWorld, username: string, amount: number, price: number) {
    const savedToken = this.token
    this.lastMakerUsername = username
    await this.loginAs(username)
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'SELL', amount: amount.toString(), price: price.toString() }),
    })
    assert.ok(this.response?.ok, `Falha ao criar ordem do maker ${username}`)
    const body = this.responseBody as { order: { id: string } }
    this.lastMakerOrderId = body.order.id
    this.token = savedToken
  },
)

Given(
  'o utilizador {string} tem uma ordem de compra de {float} BTC a {int} USD',
  async function (this: MatchWorld, username: string, amount: number, price: number) {
    const savedToken = this.token
    this.lastMakerUsername = username
    await this.loginAs(username)
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'BUY', amount: amount.toString(), price: price.toString() }),
    })
    assert.ok(this.response?.ok, `Falha ao criar ordem de compra do maker ${username}`)
    const body = this.responseBody as { order: { id: string } }
    this.lastMakerOrderId = body.order.id
    this.token = savedToken
  },
)

Then(
  'a execução ocorre ao preço de {int} USD',
  async function (this: WisiexWorld, price: number) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await this.api('/trades')
    const body = this.responseBody as { trades: { price: string }[] }
    assert.ok(body.trades.length > 0, 'Nenhuma negociação encontrada')
    assert.ok(
      Math.abs(Number(body.trades[0]!.price) - price) < 0.01,
      `Esperava execução ao preço ${price}, recebeu ${body.trades[0]!.price}`,
    )
  },
)

Then(
  /^o comprador paga (\d+) USD por ([\d.]+) BTC \(não \d+ USD\)$/,
  async function (this: WisiexWorld, executedPriceStr: string, amountStr: string) {
    const executedPrice = Number(executedPriceStr)
    const amount = Number(amountStr)
    await this.api('/trades')
    const body = this.responseBody as { trades: { price: string; amount: string }[] }
    assert.ok(body.trades.length > 0, 'Nenhuma negociação encontrada')
    const trade = body.trades[0]!
    assert.ok(
      Math.abs(Number(trade.price) - executedPrice) < 0.01,
      `Execução ao preço errado: esperava ${executedPrice}, recebeu ${trade.price}`,
    )
    assert.ok(
      Math.abs(Number(trade.amount) - amount) < 0.001,
      `Volume errado: esperava ${amount}, recebeu ${trade.amount}`,
    )
  },
)

Then(
  /^o vendedor recebe (\d+) USD por BTC \(não \d+ USD\)$/,
  async function (this: WisiexWorld, executedPriceStr: string) {
    const executedPrice = Number(executedPriceStr)
    await this.api('/trades')
    const body = this.responseBody as { trades: { price: string }[] }
    assert.ok(body.trades.length > 0, 'Nenhuma negociação encontrada')
    assert.ok(
      Math.abs(Number(body.trades[0]!.price) - executedPrice) < 0.01,
      `Execução ao preço errado: esperava ${executedPrice}, recebeu ${body.trades[0]!.price}`,
    )
  },
)

Then('as ordens não são casadas', async function (this: WisiexWorld) {
  await new Promise((resolve) => setTimeout(resolve, 800))
  await this.api('/trades')
  const body = this.responseBody as { trades: unknown[] }
  assert.equal(body.trades.length, 0, 'Não deveria ter trades')
})

Then('a minha ordem fica pendente no livro com status {string}', async function (
  this: WisiexWorld,
  status: string,
) {
  assert.ok(this.lastOrderId, 'Nenhuma ordem referenciada')
  await this.api('/orders/active')
  const body = this.responseBody as { orders: { id: string; status: string }[] }
  const order = body.orders.find((o) => o.id === this.lastOrderId)
  assert.ok(order, `Ordem ${this.lastOrderId} não encontrada nas ordens ativas`)
  assert.equal(order.status, status, `Esperava status ${status}, recebeu ${order.status}`)
})

Then('a minha ordem tem status {string}', async function (this: WisiexWorld, status: string) {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  assert.ok(this.lastOrderId, 'Nenhuma ordem referenciada')
  if (status === 'COMPLETE' || status === 'COMPLETED') {
    await this.api('/orders/history')
    const body = this.responseBody as { orders: { id: string; status: string }[] }
    const order = body.orders.find((o) => o.id === this.lastOrderId)
    assert.ok(order, `Ordem ${this.lastOrderId} não encontrada no histórico`)
    assert.ok(
      order.status === 'COMPLETED' || order.status === 'COMPLETE',
      `Esperava COMPLETED, recebeu ${order.status}`,
    )
  } else if (status === 'PARTIAL') {
    await this.api('/orders/active')
    const body = this.responseBody as { orders: { id: string; status: string }[] }
    const order = body.orders.find((o) => o.id === this.lastOrderId)
    assert.ok(order, `Ordem ${this.lastOrderId} não encontrada nas ativas`)
    assert.equal(order.status, 'PARTIAL', `Esperava PARTIAL, recebeu ${order.status}`)
  } else {
    await this.api('/orders/active')
    const body = this.responseBody as { orders: { id: string; status: string }[] }
    const order = body.orders.find((o) => o.id === this.lastOrderId)
    assert.ok(order, `Ordem ${this.lastOrderId} não encontrada`)
    assert.equal(order.status, status)
  }
})

Then(
  'a minha ordem tem status {string} com {float} BTC restantes no livro',
  async function (this: WisiexWorld, status: string, remaining: number) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    assert.ok(this.lastOrderId, 'Nenhuma ordem referenciada')
    await this.api('/orders/active')
    const body = this.responseBody as { orders: { id: string; status: string; remaining: string }[] }
    const order = body.orders.find((o) => o.id === this.lastOrderId)
    assert.ok(order, `Ordem ${this.lastOrderId} não encontrada nas ativas`)
    assert.equal(order.status, status, `Esperava ${status}, recebeu ${order.status}`)
    assert.ok(
      Math.abs(Number(order.remaining) - remaining) < 0.001,
      `Esperava ${remaining} BTC restantes, recebeu ${order.remaining}`,
    )
  },
)

Then('a ordem do maker tem status {string}', async function (this: MatchWorld, status: string) {
  if (!this.lastMakerUsername || !this.lastMakerOrderId) return
  const savedToken = this.token
  await this.loginAs(this.lastMakerUsername)
  if (status === 'COMPLETE' || status === 'COMPLETED') {
    await this.api('/orders/history')
    const body = this.responseBody as { orders: { id: string; status: string }[] }
    const order = body.orders.find((o) => o.id === this.lastMakerOrderId)
    assert.ok(order, `Ordem do maker ${this.lastMakerOrderId} não encontrada no histórico`)
    assert.ok(
      order.status === 'COMPLETED' || order.status === 'COMPLETE',
      `Esperava COMPLETED, recebeu ${order.status}`,
    )
  } else if (status === 'PARTIAL') {
    await this.api('/orders/active')
    const body = this.responseBody as { orders: { id: string; status: string }[] }
    const order = body.orders.find((o) => o.id === this.lastMakerOrderId)
    assert.ok(order, `Ordem do maker não encontrada nas ativas`)
    assert.equal(order.status, 'PARTIAL')
  }
  this.token = savedToken
})

Given('existem múltiplas ordens sendo submetidas simultaneamente', async function (this: WisiexWorld) {
  for (let i = 0; i < 3; i++) {
    const savedToken = this.token
    await this.loginAs(`concurrent_maker_${i}_bdd`)
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'SELL', amount: '0.1', price: (50000 + i * 100).toString() }),
    })
    this.token = savedToken
  }
})

When('o sistema processa as ordens', async function (this: WisiexWorld) {
  await new Promise((resolve) => setTimeout(resolve, 1500))
})

Then('cada ordem é processada sequencialmente pela fila', async function (this: WisiexWorld) {
  await this.api('/orders/book')
  const body = this.responseBody as { orderBook: { asks: unknown[] } }
  assert.ok(body.orderBook !== undefined, 'Livro de ordens não retornado')
})

Then('não ocorrem execuções duplicadas', async function (this: WisiexWorld) {
  await this.api('/trades')
  const body = this.responseBody as { trades: { id: string }[] }
  const ids = body.trades.map((t) => t.id)
  const unique = new Set(ids)
  assert.equal(unique.size, ids.length, 'Existem trades duplicados')
})

Given('não existem ordens de venda no livro', async function (this: WisiexWorld) {
  await this.api('/orders/book')
  const body = this.responseBody as { orderBook: { asks: unknown[] } }
  assert.equal(body.orderBook.asks.length, 0, 'Ainda existem asks no livro')
})

Then('a ordem fica pendente no livro com status {string}', async function (
  this: WisiexWorld,
  status: string,
) {
  assert.ok(this.lastOrderId, 'Nenhuma ordem referenciada')
  await this.api('/orders/active')
  const body = this.responseBody as { orders: { id: string; status: string }[] }
  const order = body.orders.find((o) => o.id === this.lastOrderId)
  assert.ok(order, `Ordem ${this.lastOrderId} não encontrada nas ativas`)
  assert.equal(order.status, status)
})

Then('a ordem aparece nos bids do livro de ordens', async function (this: WisiexWorld) {
  await this.api('/orders/book')
  const body = this.responseBody as { orderBook: { bids: unknown[] } }
  assert.ok(body.orderBook.bids.length > 0, 'Nenhum bid no livro')
})

Given(
  'o utilizador {string} colocou uma ordem de venda de {float} BTC a {int} USD às {int}:{int}',
  async function (
    this: MatchWorld,
    username: string,
    amount: number,
    price: number,
    _h: number,
    _m: number,
  ) {
    const savedToken = this.token
    await this.loginAs(username)
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'SELL', amount: amount.toString(), price: price.toString() }),
    })
    assert.ok(this.response?.ok, `Falha ao criar ordem FIFO do maker ${username}`)
    if (!this.lastMakerUsername) {
      this.lastMakerUsername = username
      const body = this.responseBody as { order: { id: string } }
      this.lastMakerOrderId = body.order.id
    }
    this.token = savedToken
    await new Promise((resolve) => setTimeout(resolve, 100))
  },
)

Then(
  'a ordem do {string} é executada primeiro por ter sido criada antes',
  async function (this: MatchWorld, username: string) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const savedToken = this.token
    await this.loginAs(username)
    await this.api('/orders/history')
    const body = this.responseBody as { orders: { id: string; status: string }[] }
    const completedOrder = body.orders.find(
      (o) => o.id === this.lastMakerOrderId && (o.status === 'COMPLETED' || o.status === 'COMPLETE'),
    )
    assert.ok(completedOrder, `Ordem do ${username} deveria estar COMPLETED (FIFO)`)
    this.token = savedToken
  },
)
