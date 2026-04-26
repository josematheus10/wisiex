import Fastify from 'fastify'
import { registerPlugins } from './plugins/index.js'
import { registerRoutes } from './routes/index.js'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await registerPlugins(app)
  await registerRoutes(app)

  return app
}
