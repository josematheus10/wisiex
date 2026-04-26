import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber'
import type { Browser, Page } from 'playwright'

export class WisiexWorld extends World {
  readonly apiBase: string
  readonly webBase: string

  token: string | null = null
  response: Response | null = null
  responseBody: unknown = null

  browser: Browser | null = null
  page: Page | null = null

  /** ID da última ordem criada no cenário atual */
  lastOrderId: string | null = null

  constructor(options: IWorldOptions) {
    super(options)
    this.apiBase = process.env['API_BASE'] ?? 'http://localhost:3001'
    this.webBase = process.env['WEB_BASE'] ?? 'http://localhost:5173'
  }

  /** Faz uma chamada à API e armazena response + body para as asserções */
  async api(path: string, options?: RequestInit): Promise<unknown> {
    const headers: Record<string, string> = {}
    if (options?.body) headers['Content-Type'] = 'application/json'
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`

    this.response = await fetch(`${this.apiBase}${path}`, {
      ...options,
      headers: { ...headers, ...(options?.headers as Record<string, string>) },
    })
    this.responseBody = await this.response.json().catch(() => null)
    return this.responseBody
  }

  /** Login rápido — atualiza this.token */
  async loginAs(username: string): Promise<void> {
    await this.api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    })
    const body = this.responseBody as { token: string }
    this.token = body.token
  }
}

setWorldConstructor(WisiexWorld)
