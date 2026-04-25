import { buildApp } from './app.js'
import { startWorker } from './services/order-queue.js'

const app = await buildApp()

startWorker(app.prisma, app.redis, app.io)

const port = Number(process.env['PORT'] ?? 3001)
const host = process.env['HOST'] ?? '0.0.0.0'

await app.listen({ port, host })
console.log(`API listening on http://${host}:${port}`)
