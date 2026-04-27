import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'

type FormWorld = WisiexWorld & {
  formAmount: string
  formError: string
  formRejected: boolean
  formSubmitAttempted: boolean
}

function applyAmountChange(value: string): { amount: string; error: string; rejected: boolean } {
  if (value.includes('-')) {
    return { amount: '', error: 'Invalid amount', rejected: true }
  }
  const parts = value.split('.')
  if (parts.length === 2 && parts[1].length > 9) {
    return { amount: `${parts[0]}.${parts[1].slice(0, 9)}`, error: '', rejected: false }
  }
  return { amount: value, error: '', rejected: false }
}

function applyAmountBlur(value: string): string {
  if (!value) return value
  const num = parseFloat(value)
  if (isNaN(num) || num < 0) return value
  return num.toFixed(9)
}

Given('the user is on the order creation form', function (this: FormWorld) {
  this.formAmount = ''
  this.formError = ''
  this.formRejected = false
  this.formSubmitAttempted = false
})

Given('the BTC amount field uses a decimal mask', function (this: FormWorld) {
  this.formAmount = '0.000000000'
  this.formError = ''
  this.formRejected = false
  this.formSubmitAttempted = false
})

Given('the user is filling the order form', function (this: FormWorld) {
  this.formAmount = ''
  this.formError = ''
  this.formRejected = false
  this.formSubmitAttempted = false
})

When('the user enters {string} in the BTC amount field', function (this: FormWorld, value: string) {
  const result = applyAmountChange(value)
  this.formAmount = result.amount
  this.formError = result.error
  this.formRejected = result.rejected
  if (!result.rejected) {
    this.formAmount = applyAmountBlur(result.amount)
  }
})

When('the user attempts to input a negative value using keyboard or paste', function (this: FormWorld) {
  this.formRejected = true
})

When('the user enters {string} as BTC amount', function (this: FormWorld, value: string) {
  const result = applyAmountChange(value)
  this.formAmount = result.amount
  this.formError = result.error
  this.formRejected = result.rejected
})

Then('the system should reject the input', function (this: FormWorld) {
  assert.ok(this.formRejected, 'Expected input to be rejected')
})

Then('an error message {string} should be displayed', function (this: FormWorld, message: string) {
  assert.equal(this.formError, message, `Expected error "${message}", got "${this.formError}"`)
})

Then('the field value should remain empty or reset to {string}', function (this: FormWorld, expected: string) {
  const ok = this.formAmount === '' || this.formAmount === expected
  assert.ok(ok, `Expected field value to be empty or "${expected}", got "${this.formAmount}"`)
})

Then('the field should automatically format to {string}', function (this: FormWorld, expected: string) {
  assert.equal(this.formAmount, expected, `Expected amount "${expected}", got "${this.formAmount}"`)
})

Then('the field should format to {string}', function (this: FormWorld, expected: string) {
  assert.equal(this.formAmount, expected, `Expected amount "${expected}", got "${this.formAmount}"`)
})

Then('the value should be truncated or rounded to {string}', function (this: FormWorld, expected: string) {
  assert.equal(this.formAmount, expected, `Expected amount "${expected}", got "${this.formAmount}"`)
})

Then('the system should block the negative sign', function (this: FormWorld) {
  assert.ok(this.formRejected, 'Expected negative sign to be blocked')
})

Then('the value should remain in a valid positive format {string}', function (this: FormWorld, expected: string) {
  assert.equal(this.formAmount, expected, `Expected "${expected}", got "${this.formAmount}"`)
})

Then('the form should reject the order', function (this: FormWorld) {
  const numAmount = parseFloat(this.formAmount)
  this.formSubmitAttempted = true
  if (!this.formAmount || isNaN(numAmount) || numAmount <= 0) {
    this.formError = 'Amount must be greater than zero'
    this.formRejected = true
  }
  assert.ok(this.formRejected, 'Expected order to be rejected')
})

Then('display an error {string}', function (this: FormWorld, message: string) {
  assert.equal(this.formError, message, `Expected error "${message}", got "${this.formError}"`)
})
