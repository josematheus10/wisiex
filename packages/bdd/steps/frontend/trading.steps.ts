import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'

type UIWorld = WisiexWorld & {
  clickedAskPrice?: string
  clickedAskAmount?: string
  clickedBidPrice?: string
  clickedBidAmount?: string
}

When('acedo à página de Orders', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.goto(`${this.webBase}`)
  await this.page.waitForSelector('text=Order Book', { timeout: 10_000 })
})

Given('estou na página de Orders', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.goto(`${this.webBase}`)
  await this.page.waitForSelector('text=Order Book', { timeout: 10_000 })
})

// ──────────────────────────── ORDERBOOK ────────────────────────────

Given('existe pelo menos uma ordem de venda ativa no livro de ordens', async function (this: WisiexWorld) {
  const saved = this.token
  await this.loginAs('seed_ask_ob_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', amount: '0.5', price: '50000' }),
  })
  this.token = saved
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.reload()
  await this.page.waitForSelector('text=Order Book', { timeout: 10_000 })
})

Given('existe pelo menos uma ordem de compra ativa no livro de ordens', async function (this: WisiexWorld) {
  const saved = this.token
  await this.loginAs('seed_bid_ob_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', amount: '0.3', price: '48000' }),
  })
  this.token = saved
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.reload()
  await this.page.waitForSelector('text=Order Book', { timeout: 10_000 })
})

When('clico no primeiro ask do livro de ordens', async function (this: UIWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  const firstAskRow = this.page.locator('table tr.text-danger').first()
  await firstAskRow.waitFor({ timeout: 5_000 })
  const tds = firstAskRow.locator('td')
  this.clickedAskPrice = (await tds.nth(0).innerText()).replace(/[^\d.]/g, '')
  this.clickedAskAmount = (await tds.nth(1).innerText()).trim()
  await firstAskRow.click()
})

Then('o formulário de compra é preenchido com o preço desse ask', async function (this: UIWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  assert.ok(this.clickedAskPrice, 'Nenhum ask clicado')
  const priceInput = this.page.locator('input[placeholder="0.00"]')
  await priceInput.waitFor({ timeout: 3_000 })
  const value = await priceInput.inputValue()
  assert.ok(value.length > 0, 'Campo de preço vazio após clicar no ask')
})

Then('o formulário de compra é preenchido com o volume desse ask', async function (this: UIWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  const amountInput = this.page.locator('input[placeholder="0.00000000"]')
  await amountInput.waitFor({ timeout: 3_000 })
  const value = await amountInput.inputValue()
  assert.ok(value.length > 0, 'Campo de volume vazio após clicar no ask')
})

When('clico no primeiro bid do livro de ordens', async function (this: UIWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  const firstBidRow = this.page.locator('table tr.text-success').first()
  await firstBidRow.waitFor({ timeout: 5_000 })
  const tds = firstBidRow.locator('td')
  this.clickedBidPrice = (await tds.nth(0).innerText()).replace(/[^\d.]/g, '')
  this.clickedBidAmount = (await tds.nth(1).innerText()).trim()
  await firstBidRow.click()
})

Then('o formulário de venda é preenchido com o preço desse bid', async function (this: UIWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  assert.ok(this.clickedBidPrice, 'Nenhum bid clicado')
  const priceInput = this.page.locator('input[placeholder="0.00"]')
  await priceInput.waitFor({ timeout: 3_000 })
  const value = await priceInput.inputValue()
  assert.ok(value.length > 0, 'Campo de preço vazio após clicar no bid')
})

Then('o formulário de venda é preenchido com o volume desse bid', async function (this: UIWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  const amountInput = this.page.locator('input[placeholder="0.00000000"]')
  await amountInput.waitFor({ timeout: 3_000 })
  const value = await amountInput.inputValue()
  assert.ok(value.length > 0, 'Campo de volume vazio após clicar no bid')
})

When('uma nova ordem é colocada por outro utilizador', async function (this: WisiexWorld) {
  const saved = this.token
  await this.loginAs('rt_order_placer_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', amount: '0.1', price: '55000' }),
  })
  this.token = saved
})

Then('o livro de ordens é atualizado sem recarregar a página', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.waitForFunction(
    () => {
      const rows = document.querySelectorAll('table tr.text-danger, table tr.text-success')
      return rows.length > 0
    },
    { timeout: 8_000 },
  )
})

// ──────────────────────────── TRADES ────────────────────────────

Then('a tabela de negociações globais está visível', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.waitForSelector('text=Global Matches', { timeout: 8_000 })
})

Then('a tabela apresenta as colunas Preço e Volume', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.waitForSelector('text=Price (USD)', { timeout: 5_000 })
  await this.page.waitForSelector('text=Amount (BTC)', { timeout: 5_000 })
})

Then('a tabela de histórico pessoal está visível', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.waitForSelector('text=My Order History', { timeout: 8_000 })
})

Then('a tabela apresenta as colunas Preço, Volume e Tipo', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.waitForSelector('text=Price', { timeout: 5_000 })
  await this.page.waitForSelector('text=Side', { timeout: 5_000 })
})

When('uma nova negociação é realizada por outro utilizador', async function (this: WisiexWorld) {
  const saved = this.token
  await this.loginAs('rt_trade_maker_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', amount: '0.05', price: '50000' }),
  })
  await this.loginAs('rt_trade_taker_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'BUY', amount: '0.05', price: '50000' }),
  })
  this.token = saved
  await new Promise((resolve) => setTimeout(resolve, 800))
})

Then(
  'a nova negociação aparece no topo da tabela de negociações globais sem recarregar a página',
  async function (this: WisiexWorld) {
    assert.ok(this.page, 'Browser não iniciado')
    await this.page.waitForFunction(
      () => {
        const cardHeaders = document.querySelectorAll('.card-header')
        for (const header of cardHeaders) {
          if (header.textContent?.includes('Global Matches')) {
            const tbody = header.closest('.card')?.querySelector('tbody')
            return (tbody?.querySelectorAll('tr').length ?? 0) > 0
          }
        }
        return false
      },
      { timeout: 8_000 },
    )
  },
)

// ──────────────────────────── STATS ────────────────────────────

Then('o painel de estatísticas exibe o último preço', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.waitForSelector('text=Last Price', { timeout: 5_000 })
})

Then('o painel de estatísticas exibe o volume BTC 24h', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.waitForSelector('text=24h Vol (BTC)', { timeout: 5_000 })
})

Then('o painel de estatísticas exibe o volume USD 24h', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.waitForSelector('text=24h Vol (USD)', { timeout: 5_000 })
})

Then('o painel de estatísticas exibe o máximo 24h', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.waitForSelector('text=24h High', { timeout: 5_000 })
})

Then('o painel de estatísticas exibe o mínimo 24h', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.waitForSelector('text=24h Low', { timeout: 5_000 })
})

Then('o painel de estatísticas exibe o saldo BTC do utilizador', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.waitForSelector('text=BTC Balance', { timeout: 5_000 })
})

Then('o painel de estatísticas exibe o saldo USD do utilizador', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.waitForSelector('text=USD Balance', { timeout: 5_000 })
})

Then('o painel de estatísticas é atualizado sem recarregar a página', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.waitForSelector('text=Last Price', { timeout: 5_000 })
  const value = await this.page.locator('text=Last Price').locator('..').locator('.fw-semibold').innerText()
  assert.ok(value.length > 0, 'Painel de estatísticas não exibe valor após trade')
})
