import { Before, After, BeforeAll, AfterAll, setDefaultTimeout } from '@cucumber/cucumber'
import { chromium } from 'playwright'
import type { WisiexWorld } from './world.js'

setDefaultTimeout(15_000)

const TEST_USERS = [
  'trader_bdd', 'maker_bdd', 'maker2_bdd', 'ui_trader_bdd', 'ui_trader2_bdd',
  'orderbook_trader', 'ob_buyer_bdd', 'seed_ask_ob_bdd', 'seed_bid_ob_bdd',
  'trades_trader', 'trades_other_bdd', 'trades_other2_bdd',
  'trades_buy_maker_bdd', 'trades_sell_maker_bdd',
  'stats_trader',
  'fee_trader', 'fee_maker', 'fee_maker2', 'fee_maker3', 'fee_taker',
  'fee_maker4', 'fee_taker2', 'fee_partial_maker',
  'matching_trader', 'price_maker', 'price_maker2', 'no_match_maker',
  'complete_maker', 'partial_maker2', 'fifo_maker1', 'fifo_maker2',
  'seed_ask_bdd', 'rt_order_placer_bdd', 'rt_trade_maker_bdd', 'rt_trade_taker_bdd',
  'concurrent_maker_0_bdd', 'concurrent_maker_1_bdd', 'concurrent_maker_2_bdd',
  'buy_order_bdd', 'sell_order_bdd',
]

BeforeAll(async function () {
  // Verifica se a API está acessível antes de rodar os cenários
  const base = process.env['API_BASE'] ?? 'http://localhost:3001'
  try {
    await fetch(`${base}/stats`)
  } catch {
    console.warn(`⚠ API não acessível em ${base}. Certifique-se de rodar a API antes dos testes.`)
  }
})

AfterAll(async function () {
})

Before({ tags: '@backend' }, async function (this: WisiexWorld) {
  const savedToken = this.token
  for (const username of TEST_USERS) {
    await this.loginAs(username)
    await this.api('/orders/active')
    const body = this.responseBody as { orders: { id: string }[] } | null
    if (body?.orders) {
      for (const order of body.orders) {
        await this.api(`/orders/${order.id}`, { method: 'DELETE' }).catch(() => null)
      }
    }
  }
  this.token = savedToken
})

Before(async function (
  this: WisiexWorld,
  scenario: { pickle: { tags: ReadonlyArray<{ name: string }> }; gherkinDocument: { uri?: string } },
) {
  const taggedFrontend = scenario.pickle.tags.some((tag) => tag.name === '@frontend')
  const isLoginFeature = (scenario.gherkinDocument.uri ?? '').endsWith('/login.feature')
  if (!taggedFrontend && !isLoginFeature) return

  this.browser = await chromium.launch({ headless: true })
  const context = await this.browser.newContext()
  this.page = await context.newPage()
})

After(async function (
  this: WisiexWorld,
  scenario: { pickle: { tags: ReadonlyArray<{ name: string }> }; gherkinDocument: { uri?: string } },
) {
  const taggedFrontend = scenario.pickle.tags.some((tag) => tag.name === '@frontend')
  const isLoginFeature = (scenario.gherkinDocument.uri ?? '').endsWith('/login.feature')
  if (!taggedFrontend && !isLoginFeature) return

  await this.page?.close()
  await this.browser?.close()
  this.browser = null
  this.page = null
})

After({ tags: '@backend' }, async function (this: WisiexWorld) {
  if (this.lastOrderId && this.token) {
    await this.api(`/orders/${this.lastOrderId}`, { method: 'DELETE' }).catch(() => null)
  }
})
