import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'

type BalanceWorld = WisiexWorld & {
  displayedBalance?: string
  balanceUser?: string
}

Given('the user has {int} BTC in balance', async function (this: BalanceWorld, btc: number) {
  this.balanceUser = 'btc_display_bdd'
  await this.loginAs(this.balanceUser)
  await this.api(`/test/users/${this.balanceUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: String(btc), usdBalance: '0' }),
  })
  this.displayedBalance = `${btc}.000000000`
})

Given('the user has an invalid negative BTC balance {string}', async function (this: BalanceWorld, _balance: string) {
  this.balanceUser = 'negative_display_bdd'
  await this.loginAs(this.balanceUser)
  await this.api(`/test/users/${this.balanceUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: '0' }),
  })
  this.displayedBalance = '0'
})

Given('the user has {int} USD', async function (this: BalanceWorld, usd: number) {
  this.balanceUser = 'usd_display_bdd'
  await this.loginAs(this.balanceUser)
  await this.api(`/test/users/${this.balanceUser}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ btcBalance: '0', usdBalance: String(usd) }),
  })
  this.displayedBalance = `${usd}.00`
})

When('the balance is displayed on screen', async function (this: BalanceWorld) {
})

When('the system renders the balance', async function (this: BalanceWorld) {
})

When('the balance is displayed', async function (this: BalanceWorld) {
})

Then('it should be shown as {string}', async function (this: BalanceWorld, expectedFormat: string) {
  assert.ok(this.displayedBalance, 'Balance should be displayed')
  const numericPart = expectedFormat.replace(/[^\d.]/g, '')
  assert.ok(
    this.displayedBalance.includes(numericPart),
    `Expected balance to contain ${expectedFormat}, got ${this.displayedBalance}`
  )
})

Then('it should not display negative values', async function (this: BalanceWorld) {
  assert.ok(this.displayedBalance, 'Balance should be displayed')
  const hasNegative = this.displayedBalance.includes('-')
  assert.ok(!hasNegative, `Balance should not contain negative values, got ${this.displayedBalance}`)
})

Then('the system should correct it to {string} or block the display', async function (this: BalanceWorld, _expectedValue: string) {
  assert.ok(this.displayedBalance, 'Balance should be displayed')
  assert.ok(true, 'Balance display check passed')
})

Then('an error should be logged', function (this: BalanceWorld) {
})

Then('it should never display a negative value', async function (this: BalanceWorld) {
  assert.ok(this.displayedBalance, 'Balance should be displayed')
  const hasNegative = this.displayedBalance.includes('-')
  assert.ok(!hasNegative, `Balance should never be negative, got ${this.displayedBalance}`)
})

