import cors from '@fastify/cors'
import type { FastifyInstance } from 'fastify'
import { corsOriginResolver } from './cors-origin.js'

export async function registerCors(app: FastifyInstance) {
  await app.register(cors, {
    origin: corsOriginResolver,
    credentials: true,
  })
}
