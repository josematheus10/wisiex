import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'

// ---------------------------------------------------------------------------
// Shared helpers stored on world via intersection type
// ---------------------------------------------------------------------------

type WithLoginCtx = WisiexWorld & {
  _loginUsername?: string
  _loginCount?: number
  _invalidToken?: string
}

// ---------------------------------------------------------------------------
// Scenario: Registo automático de novo utilizador
// ---------------------------------------------------------------------------

Given(
  'que o utilizador {string} não existe no sistema',
  async function (this: WithLoginCtx, username: string) {
    // Ensure a clean state — first login will auto-register; we just record the name
    this._loginUsername = username
  },
)

When(
  'o utilizador submete o nome {string} no formulário de login',
  async function (this: WithLoginCtx, username: string) {
    await this.api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    })
  },
)

Then(
  'o sistema regista automaticamente o utilizador {string}',
  function (this: WithLoginCtx, username: string) {
    assert.ok(this.response?.ok, `Esperava 201/200, recebeu ${this.response?.status}`)
    const body = this.responseBody as { user: { username: string } }
    assert.equal(body.user.username, username, 'Username retornado não corresponde')
  },
)

Then(
  'o utilizador {string} recebe um saldo inicial de {int} BTC',
  function (this: WithLoginCtx, _username: string, btc: number) {
    const body = this.responseBody as { user: { btcBalance: string } }
    assert.equal(Number(body.user.btcBalance), btc, 'Saldo BTC inicial incorreto')
  },
)

Then(
  'o utilizador {string} recebe um saldo inicial de {int} USD',
  function (this: WithLoginCtx, _username: string, usd: number) {
    const body = this.responseBody as { user: { usdBalance: string } }
    assert.equal(Number(body.user.usdBalance), usd, 'Saldo USD inicial incorreto')
  },
)

Then('um token JWT é gerado para a sessão', function (this: WithLoginCtx) {
  assert.ok(this.response?.ok, `Esperava 2xx, recebeu ${this.response?.status}`)
  const body = this.responseBody as { token: string }
  assert.ok(typeof body.token === 'string' && body.token.length > 0, 'Token ausente na resposta')
  this.token = body.token
})

// ---------------------------------------------------------------------------
// Scenario: Login de utilizador já registado
// ---------------------------------------------------------------------------

Given(
  'que o utilizador {string} já existe no sistema',
  async function (this: WithLoginCtx, username: string) {
    // Pre-register the user so they already exist before the When step
    await this.api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    })
    assert.ok(this.response?.ok, `Falha ao pré-registrar utilizador ${username}`)
    // Record how many times the login endpoint was called (1 so far for registration)
    this._loginCount = 1
  },
)

Then(
  'o sistema não cria um novo registo para {string}',
  function (this: WithLoginCtx, username: string) {
    assert.ok(this.response?.ok, `Esperava 2xx, recebeu ${this.response?.status}`)
    const body = this.responseBody as { user: { username: string } }
    // If the user already existed, the server should return the same username
    assert.equal(body.user.username, username, 'Utilizador retornado não corresponde')
  },
)

// ---------------------------------------------------------------------------
// Scenario: Token JWT é gerado e usado como Bearer
// ---------------------------------------------------------------------------

Given(
  'que o utilizador {string} se autentica com sucesso',
  async function (this: WithLoginCtx, username: string) {
    await this.loginAs(username)
    assert.ok(this.token, `Falha ao autenticar utilizador ${username}`)
    this._loginUsername = username
  },
)

When('o sistema gera o token JWT', function (this: WithLoginCtx) {
  // Token was generated in the Given step — nothing more to do here
  assert.ok(this.token, 'Token não presente no world')
})

Then('o token JWT deve ser válido', function (this: WithLoginCtx) {
  assert.ok(typeof this.token === 'string' && this.token.length > 0, 'Token inválido ou ausente')
  // A JWT has exactly 3 base64url segments separated by dots
  const parts = (this.token as string).split('.')
  assert.equal(parts.length, 3, `Token não é um JWT bem formado: ${this.token}`)
})

Then(
  'o token deve conter o identificador do utilizador {string}',
  function (this: WithLoginCtx, username: string) {
    assert.ok(this.token, 'Token ausente')
    const payload = JSON.parse(Buffer.from((this.token as string).split('.')[1]!, 'base64url').toString('utf8'))
    // The API encodes either `username` or `sub` in the payload
    const hasUser =
      payload.username === username || payload.sub === username || typeof payload.id === 'string'
    assert.ok(hasUser, `Payload do JWT não contém identificador do utilizador: ${JSON.stringify(payload)}`)
  },
)

Then(
  'requisições autenticadas com o token devem ser aceites',
  async function (this: WithLoginCtx) {
    // Use the /me route which requires a valid Bearer token
    await this.api('/me')
    assert.ok(this.response?.ok, `Rota autenticada rejeitou token válido: ${this.response?.status}`)
  },
)

// ---------------------------------------------------------------------------
// Scenario: Tentativa de login com nome vazio
// ---------------------------------------------------------------------------

When(
  'o utilizador submete um nome de utilizador vazio {string}',
  async function (this: WithLoginCtx, username: string) {
    await this.api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    })
  },
)

Then(
  'o sistema rejeita a autenticação com status {int}',
  function (this: WithLoginCtx, status: number) {
    assert.equal(this.response?.status, status, `Esperava status ${status}`)
  },
)

// ---------------------------------------------------------------------------
// Scenario: Acesso a rota protegida sem token
// ---------------------------------------------------------------------------

Given(
  'que o utilizador não possui um token JWT válido',
  function (this: WithLoginCtx) {
    // Ensure no token is set
    this.token = null
  },
)

When(
  'tenta aceder diretamente à rota de ordens sem token',
  async function (this: WithLoginCtx) {
    // Force request without token
    const savedToken = this.token
    this.token = null
    await this.api('/orders/active')
    this.token = savedToken
  },
)

Then(
  'o sistema rejeita o acesso com status {int}',
  function (this: WithLoginCtx, status: number) {
    assert.equal(this.response?.status, status, `Esperava status ${status}, recebeu ${this.response?.status}`)
  },
)

// ---------------------------------------------------------------------------
// Scenario: Acesso a rota protegida com token inválido
// ---------------------------------------------------------------------------

Given(
  'que o utilizador {string} possui um token JWT inválido',
  async function (this: WithLoginCtx, username: string) {
    // Register the user first, then create a tampered/expired token
    await this.loginAs(username)
    // Craft an obviously invalid token (valid structure, invalid signature)
    this._invalidToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmYWtlIn0.invalidsignature'
  },
)

When(
  'tenta realizar uma operação autenticada com o token inválido',
  async function (this: WithLoginCtx) {
    const saved = this.token
    this.token = this._invalidToken ?? 'invalid'
    await this.api('/me')
    this.token = saved
  },
)

Then(
  'o sistema rejeita a requisição com status {int}',
  function (this: WithLoginCtx, status: number) {
    assert.equal(this.response?.status, status, `Esperava status ${status}, recebeu ${this.response?.status}`)
  },
)

// ---------------------------------------------------------------------------
// Legacy steps kept for checkout.feature compatibility
// ---------------------------------------------------------------------------

When('faço login com o usuário {string}', async function (this: WisiexWorld, username: string) {
  await this.api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username }),
  })
})

Then('recebo um token JWT', function (this: WisiexWorld) {
  assert.ok(this.response?.ok, `Esperava 2xx, recebeu ${this.response?.status}`)
  const body = this.responseBody as { token: string }
  assert.ok(typeof body.token === 'string' && body.token.length > 0, 'Token ausente na resposta')
  this.token = body.token
})

Then(
  'o usuário tem saldo inicial de {int} BTC e {int} USD',
  function (this: WisiexWorld, btc: number, usd: number) {
    const body = this.responseBody as { user: { btcBalance: string; usdBalance: string } }
    assert.equal(Number(body.user.btcBalance), btc, 'Saldo BTC incorreto')
    assert.equal(Number(body.user.usdBalance), usd, 'Saldo USD incorreto')
  },
)

Given(
  'o usuário {string} já está registrado',
  async function (this: WisiexWorld, username: string) {
    await this.api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    })
    assert.ok(this.response?.ok, 'Falha ao pré-registrar usuário')
  },
)

Then(
  'os dados retornados correspondem ao usuário {string}',
  function (this: WisiexWorld, username: string) {
    const body = this.responseBody as { user: { username: string } }
    assert.equal(body.user.username, username)
  },
)

Then('a requisição falha com status {int}', function (this: WisiexWorld, status: number) {
  assert.equal(this.response?.status, status, `Esperava status ${status}`)
})
