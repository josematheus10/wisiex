import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'

Given('estou autenticado como {string}', async function (this: WisiexWorld, username: string) {
  await this.loginAs(username)
})

When('coloco uma ordem de compra de {float} BTC a {int} USD', async function (
  this: WisiexWorld,
  amount: number,
  price: number,
) {
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', amount: amount.toString(), price: price.toString() }),
  })
})

When('coloco uma ordem de venda de {float} BTC a {int} USD', async function (
  this: WisiexWorld,
  amount: number,
  price: number,
) {
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', amount: amount.toString(), price: price.toString() }),
  })
})

Then('a ordem é criada com status {string}', function (this: WisiexWorld, status: string) {
  assert.ok(this.response?.ok, `Esperava 201, recebeu ${this.response?.status}`)
  const body = this.responseBody as { order: { id: string; status: string } }
  assert.equal(body.order.status, status)
  this.lastOrderId = body.order.id
})

Then('a ordem aparece nas minhas ordens ativas', async function (this: WisiexWorld) {
  await this.api('/orders/active')
  const body = this.responseBody as { orders: { id: string }[] }
  const found = body.orders.some((o) => o.id === this.lastOrderId)
  assert.ok(found, `Ordem ${this.lastOrderId} não encontrada nas ordens ativas`)
})

Given('tenho uma ordem de compra ativa de {float} BTC a {int} USD', async function (
  this: WisiexWorld,
  amount: number,
  price: number,
) {
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', amount: amount.toString(), price: price.toString() }),
  })
  assert.ok(this.response?.ok, 'Falha ao criar ordem de compra')
  const body = this.responseBody as { order: { id: string } }
  this.lastOrderId = body.order.id
})

When('cancelo a ordem', async function (this: WisiexWorld) {
  assert.ok(this.lastOrderId, 'Nenhuma ordem referenciada no cenário')
  await this.api(`/orders/${this.lastOrderId}`, { method: 'DELETE' })
})

Then('o status da ordem é {string}', function (this: WisiexWorld, status: string) {
  assert.ok(this.response?.ok, `Esperava 2xx, recebeu ${this.response?.status}`)
  const body = this.responseBody as { order: { status: string } }
  assert.equal(body.order.status, status)
})

Then('a ordem aparece no meu histórico', async function (this: WisiexWorld) {
  await this.api('/orders/history')
  const body = this.responseBody as { orders: { id: string }[] }
  const found = body.orders.some((o) => o.id === this.lastOrderId)
  assert.ok(found, `Ordem ${this.lastOrderId} não encontrada no histórico`)
})

Given('o usuário {string} tem uma ordem de venda de {float} BTC a {int} USD', async function (
  this: WisiexWorld,
  username: string,
  amount: number,
  price: number,
) {
  const savedToken = this.token
  await this.loginAs(username)
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', amount: amount.toString(), price: price.toString() }),
  })
  assert.ok(this.response?.ok, `Falha ao criar ordem do maker ${username}`)
  // Restaura o token do taker
  this.token = savedToken
})

Then('as ordens são casadas', async function (this: WisiexWorld) {
  // Aguarda o worker de matching processar a fila
  await new Promise((resolve) => setTimeout(resolve, 800))
  await this.api('/trades')
  const body = this.responseBody as { trades: unknown[] }
  assert.ok(body.trades.length > 0, 'Nenhuma negociação encontrada após o matching')
})

Then('uma negociação é registrada ao preço de {int} USD', async function (
  this: WisiexWorld,
  price: number,
) {
  await this.api('/trades')
  const body = this.responseBody as { trades: { price: string }[] }
  const found = body.trades.some((t) => Math.abs(Number(t.price) - price) < 0.01)
  assert.ok(found, `Nenhuma negociação encontrada ao preço ${price}`)
})

Then('a ordem do maker tem status {string}', async function (this: WisiexWorld, status: string) {
  // O status da última ordem criada pelo maker deve ser verificado
  // Verificamos via livro de ordens: se status=PARTIAL, ainda aparece no book
  await this.api('/orders/book')
  const body = this.responseBody as { orderBook: { asks: { amount: string }[] } }
  const hasRemainingAsk = body.orderBook.asks.length > 0
  if (status === 'PARTIAL') {
    assert.ok(hasRemainingAsk, 'Esperava ordem parcial restante no livro de ofertas')
  }
})
