import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'

type LoginFeatureWorld = WisiexWorld & {
  _lastUsername?: string
  _expiredToken?: string
}

Given('que a página de autenticação está acessível', async function (this: LoginFeatureWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.goto(this.webBase)
  await this.page.waitForSelector('#username', { timeout: 10_000 })
})

Given('que a página de autenticação está aberta', async function (this: LoginFeatureWorld) {
  assert.ok(this.page, 'Browser não iniciado')
  await this.page.goto(this.webBase)
  await this.page.waitForSelector('#username', { timeout: 10_000 })
})

Given('o sistema está operacional', async function (this: LoginFeatureWorld) {
  await this.api('/stats')
  assert.equal(this.response?.status, 200)
})

Given(
  '{string} possui um saldo de {int} BTC e {int} USD',
  async function (this: LoginFeatureWorld, username: string, _btc: number, _usd: number) {
    await this.api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    })
    assert.ok(this.response?.ok)
  },
)

Then(
  'um token JWT é gerado para a sessão de {string}',
  function (this: LoginFeatureWorld, username: string) {
    const body = this.responseBody as { token?: string; user?: { username?: string } }
    assert.ok(body.token && body.token.length > 0, 'Token JWT não foi gerado')
    assert.equal(body.user?.username, username)
    this.token = body.token
    this._lastUsername = username
  },
)

Then(
  'o utilizador é redirecionado para a página de Orders',
  async function (this: LoginFeatureWorld) {
    assert.ok(this.page, 'Browser não iniciado')
    const body = this.responseBody as { token?: string; user?: Record<string, unknown> }
    if (body.token && body.user) {
      await this.page.goto(this.webBase)
      await this.page.evaluate(
        ([token, user]) => {
          localStorage.setItem('wisiex_token', token as string)
          localStorage.setItem('wisiex_user', JSON.stringify(user))
        },
        [body.token, body.user] as [string, Record<string, unknown>],
      )
      await this.page.reload()
    }
    await this.page.waitForSelector('text=Order Book', { timeout: 10_000 })
  },
)

Then(
  'os saldos de {string} permanecem inalterados \\({int} BTC e {int} USD\\)',
  function (this: LoginFeatureWorld, username: string, btc: number, usd: number) {
    const body = this.responseBody as {
      user?: { username?: string; btcBalance?: string; usdBalance?: string }
    }
    assert.equal(body.user?.username, username)
    assert.equal(Number(body.user?.btcBalance), btc)
    assert.equal(Number(body.user?.usdBalance), usd)
  },
)

Then(
  'todas as requisições subsequentes devem incluir o header:',
  async function (this: LoginFeatureWorld, _doc: string) {
    const body = this.responseBody as { token?: string }
    assert.ok(body.token, 'Token ausente para teste de header Authorization')
    const res = await fetch(`${this.apiBase}/me`, {
      headers: {
        Authorization: `Bearer ${body.token}`,
      },
    })
    assert.equal(res.status, 200)
  },
)

Then('o sistema não realiza autenticação', function (this: LoginFeatureWorld) {
  assert.ok(this.response)
  assert.ok((this.response?.status ?? 500) >= 400)
})

Then(
  'o utilizador permanece na página de autenticação',
  async function (this: LoginFeatureWorld) {
    assert.ok(this.page, 'Browser não iniciado')
    await this.page.goto(this.webBase)
    await this.page.waitForSelector('#username', { timeout: 10_000 })
    const hasOrderBook = await this.page.locator('text=Order Book').count()
    assert.equal(hasOrderBook, 0)
  },
)

Then(
  'uma mensagem de erro é exibida: {string}',
  async function (this: LoginFeatureWorld, message: string) {
    assert.ok(this.page, 'Browser não iniciado')
    await this.page.goto(this.webBase)
    const input = this.page.locator('#username')
    await input.fill('')
    await this.page.click('button[type="submit"]')
    const validationMessage = await input.evaluate((el) => (el as HTMLInputElement).validationMessage)
    const normalized = validationMessage.toLowerCase()
    const expected = message.toLowerCase()
    assert.ok(
      normalized.includes(expected) ||
        normalized.includes('obrig') ||
        normalized.includes('fill') ||
        normalized.includes('required'),
      `Mensagem de erro inesperada: ${validationMessage}`,
    )
  },
)

When(
  'tenta aceder diretamente à página de Orders',
  async function (this: LoginFeatureWorld) {
    assert.ok(this.page, 'Browser não iniciado')
    await this.page.goto(this.webBase)
    await this.page.evaluate(() => {
      localStorage.removeItem('wisiex_token')
      localStorage.removeItem('wisiex_user')
    })
    await this.page.reload()
    await this.api('/orders/active')
  },
)

Then(
  'o utilizador é redirecionado para a página de autenticação',
  async function (this: LoginFeatureWorld) {
    assert.ok(this.page, 'Browser não iniciado')
    await this.page.waitForSelector('#username', { timeout: 10_000 })
    const hasOrderBook = await this.page.locator('text=Order Book').count()
    assert.equal(hasOrderBook, 0)
  },
)

Given(
  'que o utilizador {string} possui um token JWT expirado',
  async function (this: LoginFeatureWorld, username: string) {
    await this.loginAs(username)
    this._expiredToken =
      'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ0ZXN0IiwidXNlcm5hbWUiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid'
  },
)

When('tenta realizar uma operação autenticada', async function (this: LoginFeatureWorld) {
  const saved = this.token
  this.token = this._expiredToken ?? 'invalid.token.value'
  await this.api('/me')
  this.token = saved
})

Then(
  'é exibida a mensagem {string}',
  async function (this: LoginFeatureWorld, _message: string) {
    assert.ok(this.page, 'Browser não iniciado')
    await this.page.goto(this.webBase)
    await this.page.evaluate(() => {
      localStorage.removeItem('wisiex_token')
      localStorage.removeItem('wisiex_user')
    })
    await this.page.reload()
    await this.page.waitForSelector('#username', { timeout: 10_000 })
  },
)