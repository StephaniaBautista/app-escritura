import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
const { deleteMany } = vi.hoisted(() => ({ deleteMany: vi.fn() }))
vi.mock('../../lib/prisma.js', () => ({ prisma: { aiConversation: { deleteMany } } }))
import { registerAiRetention } from '../ai-retention.js'

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  deleteMany.mockResolvedValue({ count: 2 })
})
afterEach(() => { vi.useRealTimers() })

describe('AI history retention lifecycle', () => {
  it('deletes expired history on startup and hourly, then stops on server close', async () => {
    const app = Fastify({ logger: false })
    registerAiRetention(app)
    await app.ready()
    expect(deleteMany).toHaveBeenCalledTimes(1)
    expect(deleteMany.mock.calls[0][0].where.expiresAt.lte).toBeInstanceOf(Date)
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(deleteMany).toHaveBeenCalledTimes(2)
    await app.close()
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(deleteMany).toHaveBeenCalledTimes(2)
  })
  it('keeps the API available and retries cleanup after a database failure', async () => {
    deleteMany.mockRejectedValueOnce(new Error('database temporarily unavailable'))
    const app = Fastify({ logger: false })
    registerAiRetention(app)
    await app.ready()
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(deleteMany).toHaveBeenCalledTimes(2)
    await app.close()
  })
  it('does not overlap slow cleanup operations', async () => {
    let finish: (() => void) | undefined
    deleteMany.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve }))
    const app = Fastify({ logger: false })
    registerAiRetention(app)
    await app.ready()
    await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000)
    expect(deleteMany).toHaveBeenCalledTimes(1)
    finish?.()
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(deleteMany).toHaveBeenCalledTimes(2)
    await app.close()
  })
})
