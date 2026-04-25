import { Queue, Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PrismaClient } from '@prisma/client'
import type { Server } from 'socket.io'
import { matchOrder } from './matching-engine.js'

const QUEUE_NAME = 'order-matching'

export function enqueueOrder(redis: Redis, orderId: string) {
  const queue = new Queue(QUEUE_NAME, { connection: redis })
  return queue.add('match', { orderId })
}

export function startWorker(prisma: PrismaClient, redis: Redis, io: Server) {
  const worker = new Worker<{ orderId: string }>(
    QUEUE_NAME,
    async (job) => {
      await matchOrder(prisma, io, job.data.orderId)
    },
    { connection: redis, concurrency: 1 },
  )

  worker.on('failed', (job, err) => {
    console.error(`Order matching failed for job ${job?.id}:`, err)
  })

  return worker
}
