function parseConfiguredOrigins() {
  const rawOrigins = process.env['CORS_ORIGIN']

  if (!rawOrigins) {
    return []
  }

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function isLoopbackOrigin(origin: string) {
  try {
    const url = new URL(origin)
    return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  } catch {
    return false
  }
}

export function isCorsOriginAllowed(origin: string | undefined) {
  if (!origin) {
    return true
  }

  const configuredOrigins = parseConfiguredOrigins()
  if (configuredOrigins.includes(origin)) {
    return true
  }

  if (process.env['NODE_ENV'] !== 'production' && isLoopbackOrigin(origin)) {
    return true
  }

  return false
}

export function corsOriginResolver(origin: string | undefined, callback: (error: Error | null, allow: boolean) => void) {
  callback(null, isCorsOriginAllowed(origin))
}