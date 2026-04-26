import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'

type ObWorld = WisiexWorld & { cancelledOrderPrice?: number }

Given('não existem ordens ativas no sistema', async function (this: WisiexWorld) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: { id: string }[] } | null
  for (const order of body?.orders ?? []) {
    await this.api(`/orders/${order.id}`, { method: 'DELETE' }).catch(() => null)
  }
})

When('consulto o livro de ordens', async function (this: WisiexWorld) {
  await this.api('/orders/book')
})

Then('a lista de bids está vazia', function (this: WisiexWorld) {
  const body = this.responseBody as { orderBook: { bids: unknown[] } }
  assert.equal(body.orderBook.bids.length, 0, 'Esperava bids vazios')
})

Then('a lista de asks está vazia', function (this: WisiexWorld) {
  const body = this.responseBody as { orderBook: { asks: unknown[] } }
  assert.equal(body.orderBook.asks.length, 0, 'Esperava asks vazios')
})

Given(
  'existem ordens de compra ativas de {float} BTC a {int} USD e {float} BTC a {int} USD',
  async function (this: WisiexWorld, amount1: number, price1: number, amount2: number, price2: number) {
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'BUY', amount: amount1.toString(), price: price1.toString() }),
    })
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'BUY', amount: amount2.toString(), price: price2.toString() }),
    })
  },
)

Then(
  'os bids apresentam {float} BTC agregado ao preço de {int} USD',
  async function (this: WisiexWorld, amount: number, price: number) {
    await this.api('/orders/book')
    const body = this.responseBody as { orderBook: { bids: { price: string; amount: string }[] } }
    const bid = body.orderBook.bids.find((b) => Math.abs(Number(b.price) - price) < 0.01)
    assert.ok(bid, `Nenhum bid encontrado ao preço ${price}`)
    assert.ok(
      Math.abs(Number(bid.amount) - amount) < 0.001,
      `Esperava ${amount} BTC agregado, recebeu ${bid.amount}`,
    )
  },
)

Given(
  'existem ordens de venda ativas de {float} BTC a {int} USD e {float} BTC a {int} USD',
  async function (this: WisiexWorld, amount1: number, price1: number, amount2: number, price2: number) {
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'SELL', amount: amount1.toString(), price: price1.toString() }),
    })
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'SELL', amount: amount2.toString(), price: price2.toString() }),
    })
  },
)

Then(
  'os asks apresentam {float} BTC agregado ao preço de {int} USD',
  async function (this: WisiexWorld, amount: number, price: number) {
    await this.api('/orders/book')
    const body = this.responseBody as { orderBook: { asks: { price: string; amount: string }[] } }
    const ask = body.orderBook.asks.find((a) => Math.abs(Number(a.price) - price) < 0.01)
    assert.ok(ask, `Nenhum ask encontrado ao preço ${price}`)
    assert.ok(
      Math.abs(Number(ask.amount) - amount) < 0.001,
      `Esperava ${amount} BTC agregado, recebeu ${ask.amount}`,
    )
  },
)

Given(
  'existem bids com preços {int}, {int} e {int} USD',
  async function (this: WisiexWorld, p1: number, p2: number, p3: number) {
    for (const price of [p1, p2, p3]) {
      await this.api('/orders', {
        method: 'POST',
        body: JSON.stringify({ side: 'BUY', amount: '0.1', price: price.toString() }),
      })
    }
  },
)

Then('o primeiro bid tem preço {int} USD', async function (this: WisiexWorld, price: number) {
  await this.api('/orders/book')
  const body = this.responseBody as { orderBook: { bids: { price: string }[] } }
  assert.ok(body.orderBook.bids.length > 0, 'Nenhum bid encontrado')
  assert.ok(
    Math.abs(Number(body.orderBook.bids[0]!.price) - price) < 0.01,
    `Esperava primeiro bid a ${price}, recebeu ${body.orderBook.bids[0]!.price}`,
  )
})

Then('o último bid tem preço {int} USD', function (this: WisiexWorld, price: number) {
  const body = this.responseBody as { orderBook: { bids: { price: string }[] } }
  const last = body.orderBook.bids[body.orderBook.bids.length - 1]!
  assert.ok(
    Math.abs(Number(last.price) - price) < 0.01,
    `Esperava último bid a ${price}, recebeu ${last.price}`,
  )
})

Given(
  'existem asks com preços {int}, {int} e {int} USD',
  async function (this: WisiexWorld, p1: number, p2: number, p3: number) {
    for (const price of [p1, p2, p3]) {
      await this.api('/orders', {
        method: 'POST',
        body: JSON.stringify({ side: 'SELL', amount: '0.1', price: price.toString() }),
      })
    }
  },
)

Then('o primeiro ask tem preço {int} USD', async function (this: WisiexWorld, price: number) {
  await this.api('/orders/book')
  const body = this.responseBody as { orderBook: { asks: { price: string }[] } }
  assert.ok(body.orderBook.asks.length > 0, 'Nenhum ask encontrado')
  assert.ok(
    Math.abs(Number(body.orderBook.asks[0]!.price) - price) < 0.01,
    `Esperava primeiro ask a ${price}, recebeu ${body.orderBook.asks[0]!.price}`,
  )
})

Then('o último ask tem preço {int} USD', function (this: WisiexWorld, price: number) {
  const body = this.responseBody as { orderBook: { asks: { price: string }[] } }
  const last = body.orderBook.asks[body.orderBook.asks.length - 1]!
  assert.ok(
    Math.abs(Number(last.price) - price) < 0.01,
    `Esperava último ask a ${price}, recebeu ${last.price}`,
  )
})

Given(
  'existe uma ordem de compra de {float} BTC a {int} USD',
  async function (this: ObWorld, amount: number, price: number) {
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'BUY', amount: amount.toString(), price: price.toString() }),
    })
    assert.ok(this.response?.ok, 'Falha ao criar ordem de compra')
    const body = this.responseBody as { order: { id: string } }
    this.lastOrderId = body.order.id
    this.cancelledOrderPrice = price
  },
)

Then('a ordem cancelada não aparece nos bids', async function (this: ObWorld) {
  await this.api('/orders/book')
  const body = this.responseBody as { orderBook: { bids: { price: string }[] } }
  const cancelledPrice = this.cancelledOrderPrice
  if (cancelledPrice !== undefined) {
    const bid = body.orderBook.bids.find((b) => Math.abs(Number(b.price) - cancelledPrice) < 0.01)
    assert.ok(!bid, `Bid ao preço ${cancelledPrice} ainda aparece após cancelamento`)
  } else {
    assert.equal(body.orderBook.bids.length, 0, 'Bids deveriam estar vazios após cancelamento')
  }
})

Given(
  'existe uma ordem de venda de {float} BTC a {int} USD totalmente executada',
  async function (this: WisiexWorld, amount: number, price: number) {
    const savedToken = this.token
    await this.loginAs('ob_buyer_bdd')
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'BUY', amount: amount.toString(), price: price.toString() }),
    })
    this.token = savedToken
    await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ side: 'SELL', amount: amount.toString(), price: price.toString() }),
    })
    assert.ok(this.response?.ok, 'Falha ao criar ordem de venda')
    await new Promise((resolve) => setTimeout(resolve, 1000))
  },
)

Then('a ordem executada não aparece nos asks', async function (this: WisiexWorld) {
  await this.api('/orders/book')
  const body = this.responseBody as { orderBook: { asks: unknown[] } }
  assert.equal(body.orderBook.asks.length, 0, 'Asks deveria estar vazio após execução completa')
})
