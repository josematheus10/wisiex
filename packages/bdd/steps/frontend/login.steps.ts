import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'

// ---------------------------------------------------------------------------
// Shared helper — navigate to the app and clear auth state
// ---------------------------------------------------------------------------

async function openUnauthenticated(world: WisiexWorld): Promise<void> {
  assert.ok(world.page, 'Browser não iniciado — certifique-se de usar a tag @frontend')
  await world.page.goto(world.webBase)
  // Clear any stored session so we start unauthenticated
  await world.page.evaluate(() => {
    localStorage.removeItem('wisiex_token')
    localStorage.removeItem('wisiex_user')
  })
  await world.page.reload()
  // Verify login form is visible
  await world.page.waitForSelector('#username', { timeout: 10_000 })
}

// ---------------------------------------------------------------------------
// Scenario: Novo utilizador faz login pela interface e vê a página de trading
// ---------------------------------------------------------------------------

Given(
  'que a página de autenticação está acessível no browser',
  async function (this: WisiexWorld) {
    await openUnauthenticated(this)
  },
)

When(
  'o utilizador preenche o campo de nome com {string} e clica em entrar',
  async function (this: WisiexWorld, username: string) {
    assert.ok(this.page, 'Browser não iniciado')
    await this.page.fill('#username', username)
    await this.page.click('button[type="submit"]')
  },
)

Then('é redirecionado para a página de Orders', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.waitForSelector('text=Order Book', { timeout: 10_000 })
})

Then('pode ver o saldo na barra de estatísticas', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.waitForSelector('text=BTC Balance', { timeout: 5_000 })
  const el = await this.page.$('text=BTC Balance')
  assert.ok(el, 'Saldo BTC não encontrado na barra de estatísticas')
})

// ---------------------------------------------------------------------------
// Scenario: Tentativa de login com campo vazio na interface
// ---------------------------------------------------------------------------

When(
  'o utilizador tenta submeter o formulário com o campo vazio',
  async function (this: WisiexWorld) {
    assert.ok(this.page, 'Browser não iniciado')
    // Clear the field and attempt submit
    await this.page.fill('#username', '')
    await this.page.click('button[type="submit"]')
    // Brief wait to allow any navigation to occur
    await this.page.waitForTimeout(500)
  },
)

Then(
  'o formulário não é submetido e o utilizador permanece na página de autenticação',
  async function (this: WisiexWorld) {
    assert.ok(this.page, 'Browser não iniciado')
    // The login input must still be present — user has not navigated away
    const input = await this.page.$('#username')
    assert.ok(input, 'Campo de username não encontrado — o utilizador saiu da página de autenticação')
    // The trading page must NOT have appeared
    const tradingTitle = await this.page.$('text=Order Book')
    assert.equal(tradingTitle, null, 'A página de trading foi exibida com campo vazio — não era esperado')
  },
)

// ---------------------------------------------------------------------------
// Scenario: Acesso direto à URL de trading sem autenticação
// ---------------------------------------------------------------------------

Given(
  'que o utilizador não está autenticado no browser',
  async function (this: WisiexWorld) {
    assert.ok(this.page, 'Browser não iniciado')
    await this.page.goto(this.webBase)
    await this.page.evaluate(() => {
      localStorage.removeItem('wisiex_token')
      localStorage.removeItem('wisiex_user')
    })
  },
)

When(
  'navega directamente para a página de Orders no browser',
  async function (this: WisiexWorld) {
    assert.ok(this.page, 'Browser não iniciado')
    // Reload after clearing storage — the app should redirect to login
    await this.page.reload()
    await this.page.waitForLoadState('networkidle')
  },
)

Then(
  'o sistema exibe a página de autenticação',
  async function (this: WisiexWorld) {
    assert.ok(this.page, 'Browser não iniciado')
    await this.page.waitForSelector('#username', { timeout: 5_000 })
    const input = await this.page.$('#username')
    assert.ok(input, 'Página de autenticação não exibida para utilizador não autenticado')
  },
)

// ---------------------------------------------------------------------------
// Legacy steps kept for backward compatibility with old login.feature
// ---------------------------------------------------------------------------

Given('abro a exchange no navegador', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado — certifique-se de usar a tag @frontend')
  await this.page.goto(this.webBase)
})

When('preencho o campo de usuário com {string}', async function (this: WisiexWorld, username: string) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.fill('#username', username)
})

When('clico no botão de entrar', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.click('button[type="submit"]')
})

Then('vejo a página de negociação', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.waitForSelector('text=Order Book', { timeout: 10_000 })
})

Then('posso ver meu saldo na barra de estatísticas', async function (this: WisiexWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.waitForSelector('text=BTC Balance', { timeout: 5_000 })
  const el = await this.page.$('text=BTC Balance')
  assert.ok(el, 'Saldo BTC não encontrado na barra de estatísticas')
})
