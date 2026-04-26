import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'

type AuthWorld = WisiexWorld & { loginUsername?: string }

Given('the user provides a username {string}', function (this: AuthWorld, username: string) {
  this.loginUsername = `${username}_auth_bdd`
})

Given('the user does not exist', async function (this: AuthWorld) {
  const username = this.loginUsername ?? 'noexist_auth_bdd'
  await fetch(`${this.apiBase}/test/reset`, { method: 'DELETE' }).catch(() => null)
  this.loginUsername = username
})

When('the user logs in', async function (this: AuthWorld) {
  const username = this.loginUsername ?? 'auth_bdd'
  await this.api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username }),
  })
  const body = this.responseBody as { token?: string }
  if (body?.token) this.token = body.token
})

Then('a new user should be created', function (this: AuthWorld) {
  assert.equal(this.response?.status, 200)
  const body = this.responseBody as { user: { id: string } }
  assert.ok(body?.user?.id, 'Response must contain user.id')
})

Then('the user should have {int} BTC balance', function (this: AuthWorld, btc: number) {
  const body = this.responseBody as { user: { btcBalance: string } }
  assert.equal(Number(body.user.btcBalance), btc)
})

Then('the user should have {int} USD balance', function (this: AuthWorld, usd: number) {
  const body = this.responseBody as { user: { usdBalance: string } }
  assert.equal(Number(body.user.usdBalance), usd)
})

Then('a JWT token should be generated', function (this: AuthWorld) {
  const body = this.responseBody as { token: string }
  assert.ok(body?.token, 'Response must contain token')
})

Given('the user {string} already exists', async function (this: AuthWorld, username: string) {
  const unique = `${username}_exist_bdd`
  this.loginUsername = unique
  await this.api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: unique }),
  })
  this.token = null
})

Then('the user should be authenticated', function (this: AuthWorld) {
  const body = this.responseBody as { token: string }
  assert.ok(body?.token, 'Token must be present')
})
