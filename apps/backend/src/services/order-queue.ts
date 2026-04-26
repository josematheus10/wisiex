import { Queue, Worker } from 'bullmq'
import { Redis } from 'ioredis'
import type { PrismaClient } from '@prisma/client'
import type { Server } from 'socket.io'
import { matchOrder } from './matching-engine.js'

const QUEUE_NAME = 'order-matching'

function makeBullConnection() {
  return new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  })
}

export function enqueueOrder(redis: Redis, orderId: string) {
  const queue = new Queue(QUEUE_NAME, { connection: makeBullConnection() })
  return queue.add('match', { orderId })
}

export function startWorker(prisma: PrismaClient, redis: Redis, io: Server) {
  const worker = new Worker<{ orderId: string }>(
    QUEUE_NAME,
    async (job) => {
      await matchOrder(prisma, io, job.data.orderId)
    },
    { connection: makeBullConnection(), concurrency: 1 },
  )

  worker.on('failed', (job, err) => {
    console.error(`Order matching failed for job ${job?.id}:`, err)
  })

  return worker
}
