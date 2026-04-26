import { Before, After, BeforeAll, AfterAll, setDefaultTimeout } from '@cucumber/cucumber'
import { chromium } from 'playwright'
import type { WisiexWorld } from './world.js'

setDefaultTimeout(15_000)

const TEST_USERS = ['trader_bdd', 'maker_bdd', 'maker2_bdd', 'ui_trader_bdd']

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
  scenario: { pickle: { tags: Array<{ name: string }> }; gherkinDocument: { uri?: string } },
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
  scenario: { pickle: { tags: Array<{ name: string }> }; gherkinDocument: { uri?: string } },
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
