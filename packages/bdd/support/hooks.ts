import { Before, After, BeforeAll, AfterAll, setDefaultTimeout } from '@cucumber/cucumber'
import { chromium } from 'playwright'
import type { WisiexWorld } from './world.js'

setDefaultTimeout(15_000)

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
  // Teardown global se necessário
})

Before({ tags: '@frontend' }, async function (this: WisiexWorld) {
  this.browser = await chromium.launch({ headless: true })
  const context = await this.browser.newContext()
  this.page = await context.newPage()
})

After({ tags: '@frontend' }, async function (this: WisiexWorld) {
  await this.page?.close()
  await this.browser?.close()
  this.browser = null
  this.page = null
})

After({ tags: '@backend' }, async function (this: WisiexWorld) {
  // Cancela ordens pendentes criadas no cenário para não poluir o livro
  if (this.lastOrderId && this.token) {
    await this.api(`/orders/${this.lastOrderId}`, { method: 'DELETE' }).catch(() => null)
  }
})
