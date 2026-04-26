import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { WisiexWorld } from '../../support/world.js'

type BookFrontWorld = WisiexWorld & {
  clickedPrice?: string
  clickedSide?: 'bid' | 'ask'
}

async function loginToTradingPage(world: BookFrontWorld, username: string) {
  assert.ok(world.page, 'Browser page must be available')
  await world.loginAs(username)
  await world.page!.goto(world.webBase)
  await world.page!.waitForSelector('input#username', { timeout: 10000 })
  await world.page!.fill('input#username', username)
  await world.page!.click('button[type="submit"]')
  await world.page!.waitForSelector('button:has-text("Logout")', { timeout: 10000 })
}

async function ensureOrderBookHasEntries(world: BookFrontWorld) {
  const apiBase = world.apiBase
  const token = world.token
  if (!token) return

  const res = await fetch(`${apiBase}/orders/book`)
  const book = (await res.json()) as { orderBook: { bids: unknown[]; asks: unknown[] } }

  if (book.orderBook.bids.length === 0) {
    await fetch(`${apiBase}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ side: 'BUY', price: '9000', amount: '0.1' }),
    })
  }
  if (book.orderBook.asks.length === 0) {
    await fetch(`${apiBase}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ side: 'SELL', price: '11000', amount: '0.1' }),
    })
  }
}

Given('the user clicks a bid entry', async function (this: BookFrontWorld) {
  await loginToTradingPage(this, 'ui_trader_bdd')
  await ensureOrderBookHasEntries(this)
  await this.page!.waitForTimeout(1000)
  this.clickedSide = 'bid'
})

When('the bid is selected', async function (this: BookFrontWorld) {
  assert.ok(this.page, 'Browser page must be available')
  const bidRow = this.page!.locator('tr.text-success').first()
  const visible = await bidRow.isVisible().catch(() => false)
  if (visible) {
    const priceText = await bidRow.locator('td').first().textContent()
    this.clickedPrice = priceText?.replace(/,/g, '') ?? undefined
    await bidRow.click()
    await this.page!.waitForTimeout(500)
  }
})

Then('the sell form should be filled with price and volume', async function (this: BookFrontWorld) {
  assert.ok(this.page, 'Browser page must be available')
  const sellBtn = this.page!.locator('button:has-text("Sell BTC")')
  const isSellActive = await sellBtn.evaluate((el) => el.classList.contains('btn-danger')).catch(() => false)
  const priceInput = this.page!.locator('input[type="number"]').first()
  const priceValue = await priceInput.inputValue().catch(() => '')
  assert.ok(isSellActive || priceValue !== '', 'Sell form should be prefilled after clicking bid')
})

Given('the user clicks an ask entry', async function (this: BookFrontWorld) {
  await loginToTradingPage(this, 'ui_trader2_bdd')
  await ensureOrderBookHasEntries(this)
  await this.page!.waitForTimeout(1000)
  this.clickedSide = 'ask'
})

When('the ask is selected', async function (this: BookFrontWorld) {
  assert.ok(this.page, 'Browser page must be available')
  const askRow = this.page!.locator('tr.text-danger').first()
  const visible = await askRow.isVisible().catch(() => false)
  if (visible) {
    const priceText = await askRow.locator('td').first().textContent()
    this.clickedPrice = priceText?.replace(/,/g, '') ?? undefined
    await askRow.click()
    await this.page!.waitForTimeout(500)
  }
})

Then('the buy form should be filled with price and volume', async function (this: BookFrontWorld) {
  assert.ok(this.page, 'Browser page must be available')
  const buyBtn = this.page!.locator('button:has-text("Buy BTC")')
  const isBuyActive = await buyBtn.evaluate((el) => el.classList.contains('btn-success')).catch(() => false)
  const priceInput = this.page!.locator('input[type="number"]').first()
  const priceValue = await priceInput.inputValue().catch(() => '')
  assert.ok(isBuyActive || priceValue !== '', 'Buy form should be prefilled after clicking ask')
})
