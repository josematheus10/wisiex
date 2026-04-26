import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'

type AuthFrontWorld = WisiexWorld & { authUsername?: string }

Given('the user is authenticated', async function (this: AuthFrontWorld) {
  this.authUsername = 'auth_redirect_bdd'
  await this.loginAs(this.authUsername)
})

When('the login is successful', function (this: AuthFrontWorld) {
  assert.ok(this.token, 'User must be authenticated')
})

Then('the user should be redirected to the orders page', async function (this: AuthFrontWorld) {
  assert.ok(this.page, 'Browser page must be available')
  await this.page!.goto(`${this.webBase}`)
  await this.page!.waitForSelector('input#username', { timeout: 10000 })
  await this.page!.fill('input#username', this.authUsername ?? 'auth_redirect_bdd')
  await this.page!.click('button[type="submit"]')
  await this.page!.waitForSelector('button:has-text("Logout")', { timeout: 10000 })
  const hasLogout = await this.page!.isVisible('button:has-text("Logout")')
  assert.ok(hasLogout, 'Expected trading page with Logout button after login')
})
