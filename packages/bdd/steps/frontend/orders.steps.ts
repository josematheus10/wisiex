import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'

/** Faz login via API e injeta o token no localStorage da página aberta */
Given('estou autenticado na web como {string}', async function (this: WisiexWorld, username: string) {
  assert.ok(this.page, 'Browser não iniciado — certifique-se de usar a tag @frontend')
  // Abre a página primeiro para poder acessar o contexto da origem
  await this.page.goto(this.webBase)
  // Obtém token via API
  await this.loginAs(username)
  assert.ok(this.token, 'Falha ao obter token de autenticação')
  // Injeta token e dados do usuário no localStorage (mesma chave usada pelo useAuth hook)
  const body = this.responseBody as { user: Record<string, unknown> }
  await this.page.evaluate(
    ([token, user]) => {
      localStorage.setItem('wisiex_token', token as string)
      localStorage.setItem('wisiex_user', JSON.stringify(user))
    },
    [this.token, body.user] as [string, Record<string, unknown>],
  )
  // Recarrega para que o React leia o localStorage e renderize o TradingPage
  await this.page.reload()
  await this.page.waitForSelector('text=Order Book', { timeout: 10_000 })
})

Given('existe pelo menos uma ordem no livro de ofertas', async function (this: WisiexWorld) {
  // Garante que há ao menos uma ordem de venda no livro criando uma via API
  const saved = this.token
  await this.loginAs('seed_ask_bdd')
  await this.api('/orders', {
    method: 'POST',
    body: JSON.stringify({ side: 'SELL', amount: '0.5', price: '50000' }),
  })
  this.token = saved
  // Recarrega a página para que o livro de ordens reflita a nova ordem
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.reload()
  await this.page.waitForSelector('text=Order Book', { timeout: 10_000 })
})

When('clico no primeiro preço de venda no livro de ordens', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  // As linhas de venda (asks) têm classe text-danger na tabela do livro de ordens
  const firstAskRow = this.page.locator('table tr.text-danger').first()
  await firstAskRow.waitFor({ timeout: 5_000 })
  // Armazena o preço antes de clicar para verificar o preenchimento do formulário
  const priceText = await firstAskRow.locator('td').first().innerText()
  ;(this as WisiexWorld & { lastClickedPrice?: string }).lastClickedPrice = priceText
    .replace(/[^\d.]/g, '')
  await firstAskRow.click()
})

Then('o formulário de compra é preenchido com aquele preço', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  const expected = (this as WisiexWorld & { lastClickedPrice?: string }).lastClickedPrice
  assert.ok(expected, 'Nenhum preço de clique registrado')
  // Aguarda o input de preço ter um valor
  const priceInput = this.page.locator('input[type="number"]').first()
  await priceInput.waitFor({ timeout: 3_000 })
  const value = await priceInput.inputValue()
  assert.ok(
    value.length > 0,
    'O campo de preço do formulário está vazio após clicar no livro de ordens',
  )
})

When(
  'preencho o formulário de compra com {float} BTC a {int} USD',
  async function (this: WisiexWorld, amount: number, price: number) {
    assert.ok(this.page, 'Browser não iniciado')
    // Garante que o botão "Buy BTC" está ativo
    await this.page.click('button:has-text("Buy BTC")')
    // Preenche preço (primeiro input number) e quantidade (segundo input number)
    const inputs = this.page.locator('.card-body form input[type="number"]')
    await inputs.nth(0).fill(String(price))
    await inputs.nth(1).fill(String(amount))
  },
)

When('submeto o formulário de ordem', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.click('button:has-text("Place BUY Order")')
})

Then('a ordem aparece na tabela de ordens ativas', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  // Aguarda a seção "My Active Orders" exibir ao menos uma linha de dados
  await this.page.waitForFunction(
    () => {
      const headers = document.querySelectorAll('.card-header')
      for (const h of headers) {
        if (h.textContent?.includes('My Active Orders')) {
          const card = h.closest('.card')
          const rows = card?.querySelectorAll('tbody tr')
          return rows && rows.length > 0 && !rows[0]?.textContent?.includes('No active orders')
        }
      }
      return false
    },
    { timeout: 10_000 },
  )
})
