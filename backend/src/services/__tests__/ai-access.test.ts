import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db } = vi.hoisted(() => ({ db: {
  user: { findUnique: vi.fn() }, role: { findUnique: vi.fn() }, project: { findFirst: vi.fn() },
  aiUsage: { upsert: vi.fn(), updateMany: vi.fn() },
} }))
vi.mock('../../lib/prisma.js', () => ({ prisma: db }))
import { authorizeAi, withAiQuota } from '../ai-access.js'

describe('AI permission and shared quota boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.user.findUnique.mockResolvedValue({ role: 'writer', status: 'active', suspendedUntil: null })
    db.project.findFirst.mockResolvedValue({ id: 'p1' })
    db.role.findUnique.mockResolvedValue({ permissions: ['ai_chat'] })
    db.aiUsage.updateMany.mockResolvedValue({ count: 1 })
  })
  it('resolves current role permissions for every request, including revocation', async () => {
    await expect(authorizeAi('p1', 'u1', 'ai_chat')).resolves.toMatchObject({ canCopy: false })
    db.role.findUnique.mockResolvedValue({ permissions: [] })
    await expect(authorizeAi('p1', 'u1', 'ai_chat')).rejects.toMatchObject({ code: 'AI_PERMISSION_REQUIRED' })
  })
  it('rejects access to another project before reading role permissions', async () => {
    db.project.findFirst.mockResolvedValue(null)
    await expect(authorizeAi('foreign', 'u1', 'ai_chat')).rejects.toMatchObject({ statusCode: 404 })
    expect(db.role.findUnique).not.toHaveBeenCalled()
  })
  it.each(['banned', 'suspended', 'unknown-status'])('blocks %s even with an existing session', async (status) => {
    db.user.findUnique.mockResolvedValue({ role: 'superadmin', status, suspendedUntil: null })
    await expect(authorizeAi('p1', 'u1', 'ai_chat')).rejects.toMatchObject({ statusCode: 403 })
    expect(db.project.findFirst).not.toHaveBeenCalled()
  })
  it('allows expired suspension and only superadmin gets copy permission', async () => {
    db.user.findUnique.mockResolvedValue({ role: 'superadmin', status: 'suspended', suspendedUntil: new Date(0) })
    await expect(authorizeAi('p1', 'u1', 'ai_characters')).resolves.toMatchObject({ canCopy: true })
  })
  it('does not run a provider operation when another process holds the lease or quota is full', async () => {
    db.aiUsage.updateMany.mockResolvedValue({ count: 0 })
    const provider = vi.fn()
    await expect(withAiQuota('u1', provider)).rejects.toMatchObject({ code: 'AI_RATE_LIMITED', statusCode: 429 })
    expect(provider).not.toHaveBeenCalled()
  })
  it('skips quota and lease for superadmin', async () => {
    db.user.findUnique.mockResolvedValue({ role: 'superadmin' })
    const provider = vi.fn(async (budget: { consumeRetry: () => Promise<void> }) => {
      await budget.consumeRetry()
      return 'done'
    })
    await expect(withAiQuota('admin-1', provider)).resolves.toBe('done')
    expect(provider).toHaveBeenCalledOnce()
    expect(db.aiUsage.upsert).not.toHaveBeenCalled()
    expect(db.aiUsage.updateMany).not.toHaveBeenCalled()
  })
  it('counts a repair atomically using the current lease owner token', async () => {
    await withAiQuota('u1', async (budget) => { await budget.consumeRetry() })
    const acquisition = db.aiUsage.updateMany.mock.calls[1][0]
    const retry = db.aiUsage.updateMany.mock.calls[2][0]
    expect(retry.where).toMatchObject({ userId: 'u1', leaseToken: acquisition.data.leaseToken, requestCount: { lt: 10 } })
    expect(retry.data).toEqual({ requestCount: { increment: 1 } })
  })
  it('rejects a repair when quota is exhausted or the lease belongs to another request', async () => {
    db.aiUsage.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
    await expect(withAiQuota('u1', async (budget) => budget.consumeRetry())).rejects.toMatchObject({ code: 'AI_RATE_LIMITED' })
  })
  it('subtracts acquisition time from the generation deadline and aborts before lease expiry', async () => {
    vi.useFakeTimers()
    try {
      const startedAt = Date.now()
      db.aiUsage.updateMany.mockImplementationOnce(async () => { await vi.advanceTimersByTimeAsync(25_000); return { count: 1 } })
      await expect(withAiQuota('u1', async (budget) => {
        await vi.advanceTimersByTimeAsync(164_999)
        expect(budget.signal.aborted).toBe(false)
        await vi.advanceTimersByTimeAsync(1)
        expect(budget.signal.aborted).toBe(true)
        expect(Date.now() - startedAt).toBe(190_000)
      })).rejects.toMatchObject({ code: 'AI_TIMEOUT' })
    } finally { vi.useRealTimers() }
  })
  it('preserves the original operation failure if releasing the lease also fails', async () => {
    const original = Object.assign(new Error('original RAG failure'), { code: 'P2037' })
    db.aiUsage.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 }).mockRejectedValueOnce(new Error('cleanup failure'))
    await expect(withAiQuota('u1', async () => { throw original })).rejects.toBe(original)
  })
  it('reports a failed lease release after a successful operation', async () => {
    const cleanup = new Error('cleanup failure')
    db.aiUsage.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 }).mockRejectedValueOnce(cleanup)
    await expect(withAiQuota('u1', async () => 'done')).rejects.toBe(cleanup)
  })
  it('releases its own lease when a provider fails without erasing request consumption', async () => {
    await expect(withAiQuota('u1', async () => { throw new Error('provider failed') })).rejects.toThrow('provider failed')
    const release = db.aiUsage.updateMany.mock.calls.at(-1)?.[0]
    expect(release).toEqual({ where: { userId: 'u1', leaseToken: expect.any(String) }, data: { leaseUntil: null, leaseToken: null } })
  })
})
