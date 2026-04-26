import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../matching-engine.js', () => ({
  matchOrder: vi.fn().mockResolvedValue(undefined),
}))

const bullmqMocks = vi.hoisted(() => {
  let capturedProcessor: any = null
  let capturedFailedHandler: any = null
  const mockAdd = vi.fn().mockResolvedValue({ id: 'job1' })

  function MockQueue(this: any, _name: string, _opts: any) {
    this.add = mockAdd
  }

  function MockWorker(this: any, _name: string, processor: any) {
    capturedProcessor = processor
    this.on = function (event: string, handler: any) {
      if (event === 'failed') capturedFailedHandler = handler
    }
  }

  return {
    Queue: MockQueue,
    Worker: MockWorker,
    mockAdd,
    getProcessor: () => capturedProcessor,
    getFailedHandler: () => capturedFailedHandler,
  }
})

vi.mock('bullmq', () => ({
  Queue: bullmqMocks.Queue,
  Worker: bullmqMocks.Worker,
}))

import { enqueueOrder, startWorker } from '../order-queue.js'
import { matchOrder } from '../matching-engine.js'

describe('enqueueOrder', () => {
  it('adds a job with the correct orderId', async () => {
    const mockRedis = {} as any
    await enqueueOrder(mockRedis, 'order123')
    expect(bullmqMocks.mockAdd).toHaveBeenCalledWith('match', { orderId: 'order123' })
  })
})

describe('startWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a Worker and exposes a processor function', () => {
    startWorker({} as any, {} as any, {} as any)
    expect(bullmqMocks.getProcessor()).toBeTypeOf('function')
  })

  it('processor calls matchOrder with prisma, io and orderId', async () => {
    const mockPrisma = { id: 'prisma' } as any
    const mockIo = { id: 'io' } as any
    startWorker(mockPrisma, {} as any, mockIo)

    const processor = bullmqMocks.getProcessor()
    await processor({ data: { orderId: 'order-abc' } })

    expect(vi.mocked(matchOrder)).toHaveBeenCalledWith(mockPrisma, mockIo, 'order-abc')
  })

  it('failed handler logs error with job id', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    startWorker({} as any, {} as any, {} as any)

    const failedHandler = bullmqMocks.getFailedHandler()
    failedHandler({ id: 'job1' }, new Error('fail'))
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('failed handler handles null job (optional chaining branch)', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    startWorker({} as any, {} as any, {} as any)

    const failedHandler = bullmqMocks.getFailedHandler()
    failedHandler(null, new Error('fail'))
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
