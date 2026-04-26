import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'

type World = WisiexWorld & { orderPrice?: number; orderAmount?: number; computedTotal?: number }

Given(
  'the user enters amount {int} BTC and price {int} USD',
  function (this: World, amount: number, price: number) {
    this.orderAmount = amount
    this.orderPrice = price
  },
)

When('the form is updated', function (this: World) {
  this.computedTotal = (this.orderPrice ?? 0) * (this.orderAmount ?? 0)
})

Then('the total should be {int} USD', function (this: World, expectedTotal: number) {
  assert.equal(this.computedTotal, expectedTotal, `Expected total ${expectedTotal}, got ${this.computedTotal}`)
})
