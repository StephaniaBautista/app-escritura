import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() }, document: { findFirst: vi.fn(), update: vi.fn() }, folder: { findFirst: vi.fn() }, writingStats: { upsert: vi.fn() }, $transaction: vi.fn(),
}))
vi.mock('../../lib/prisma.js', () => ({ prisma: db }))
vi.mock('../../lib/rag-index-service.js', () => ({
  ragIndexService: { schedule: vi.fn(async () => undefined), indexDocument: vi.fn(), ensureProject: vi.fn() },
}))
import { updateWrittenDocument } from '../stats-document-service.js'
import { writingTransaction } from '../../lib/stats-transaction.js'
import { ragIndexService } from '../../lib/rag-index-service.js'

const content = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
const row = () => ({ id: 'doc', userId: 'user', projectId: 'project', wordCount: 2, content: content('uno dos') })

beforeEach(() => {
  vi.resetAllMocks()
  db.$transaction.mockImplementation((run) => run(db))
  db.user.findUnique.mockResolvedValue({ status: 'active', suspendedUntil: null })
  db.document.findFirst.mockResolvedValue(row())
  db.document.update.mockImplementation(({ data }) => Promise.resolve({ ...row(), ...data }))
})

describe('transactional writing additions', () => {
  it('saves content, its current count and positive growth in one serializable transaction', async () => {
    const result = await updateWrittenDocument('doc', 'user', { content: content('uno dos tres'), timeZone: 'UTC' })
    expect(result?.wordCount).toBe(3)
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: 'Serializable' }))
    expect(db.document.findFirst).toHaveBeenCalledWith({ where: { id: 'doc', userId: 'user', project: { userId: 'user' } } })
    expect(db.writingStats.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ userId: 'user', documentId: 'doc', projectId: 'project', wordsAdded: 1 }) }))
    expect(ragIndexService.schedule).toHaveBeenCalledWith('doc', 'user')
  })
  it('does not count a replay of the same save', async () => {
    db.document.findFirst.mockResolvedValue({ ...row(), content: content('uno dos tres'), wordCount: 3 })
    await updateWrittenDocument('doc', 'user', { content: content('uno dos tres') })
    expect(db.writingStats.upsert).not.toHaveBeenCalled()
  })
  it('does not count formatting, replacement at equal length, or deletions', async () => {
    await updateWrittenDocument('doc', 'user', { content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'uno dos' }] }] } })
    await updateWrittenDocument('doc', 'user', { content: content('tres cuatro') })
    await updateWrittenDocument('doc', 'user', { content: content('uno') })
    expect(db.writingStats.upsert).not.toHaveBeenCalled()
  })
  it('uses the actual legacy text instead of inventing historical words', async () => {
    db.document.findFirst.mockResolvedValue({ ...row(), wordCount: null })
    await updateWrittenDocument('doc', 'user', { content: content('uno dos tres') })
    expect(db.writingStats.upsert.mock.calls[0]![0].create.wordsAdded).toBe(1)
  })
  it('assigns the server save to the local writing day', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-12T01:00:00Z'))
    try {
      await updateWrittenDocument('doc', 'user', { content: content('uno dos tres'), timeZone: 'America/Mexico_City' })
      expect(db.writingStats.upsert.mock.calls[0]![0].create.day).toBe('2026-09-11')
    } finally { vi.useRealTimers() }
  })
  it('refuses newly suspended accounts before writing content or statistics', async () => {
    db.user.findUnique.mockResolvedValue({ status: 'suspended', suspendedUntil: null })
    await expect(updateWrittenDocument('doc', 'user', { content: content('uno dos tres') })).rejects.toMatchObject({ statusCode: 403 })
    expect(db.document.update).not.toHaveBeenCalled()
  })
  it('returns no document for foreign resources and refuses foreign metadata targets', async () => {
    db.document.findFirst.mockResolvedValueOnce(null)
    expect(await updateWrittenDocument('foreign', 'user', { content: content('x') })).toBeNull()
    db.folder.findFirst.mockResolvedValue(null)
    expect(await updateWrittenDocument('doc', 'user', { content: content('x'), folderId: 'foreign' })).toBeNull()
    expect(db.document.update).not.toHaveBeenCalled()
  })
  it('propagates transaction rollback failures rather than reporting a successful save', async () => {
    db.writingStats.upsert.mockRejectedValue(new Error('database failure'))
    await expect(updateWrittenDocument('doc', 'user', { content: content('uno dos tres') })).rejects.toThrow('database failure')
  })
})

describe('serializable retries', () => {
  it('re-reads the committed content after a concurrent save conflict', async () => {
    db.$transaction.mockRejectedValueOnce(Object.assign(new Error('conflict'), { code: 'P2034' }))
    db.document.findFirst.mockResolvedValue({ ...row(), content: content('uno dos tres'), wordCount: 3 })
    await updateWrittenDocument('doc', 'user', { content: content('uno dos tres') })
    expect(db.$transaction).toHaveBeenCalledTimes(2)
    expect(db.writingStats.upsert).not.toHaveBeenCalled()
  })
  it('bounds contention retries and does not retry unrelated errors', async () => {
    db.$transaction.mockRejectedValue(Object.assign(new Error('conflict'), { code: 'P2034' }))
    await expect(writingTransaction(async () => 1)).rejects.toMatchObject({ code: 'P2034' })
    expect(db.$transaction).toHaveBeenCalledTimes(3)
    db.$transaction.mockClear().mockRejectedValue(new Error('offline'))
    await expect(writingTransaction(async () => 1)).rejects.toThrow('offline')
    expect(db.$transaction).toHaveBeenCalledTimes(1)
  })
})
