import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() }, project: { findMany: vi.fn() },
  document: { findMany: vi.fn(), aggregate: vi.fn() }, writingStats: { groupBy: vi.fn() },
}))
vi.mock('../../lib/prisma.js', () => ({ prisma: db }))
import { statsService } from '../stats-service.js'

beforeEach(() => {
  vi.resetAllMocks()
  db.user.findUnique.mockResolvedValue({ status: 'active', suspendedUntil: null })
  db.project.findMany.mockResolvedValue([{ id: 'project', name: 'Novela' }])
  db.document.findMany.mockImplementation(({ where }) => Promise.resolve(where.wordCount === null ? [] : [
    { id: 'root', title: 'Manuscrito', projectId: 'project', parentId: null },
    { id: 'chapter', title: 'Capítulo', projectId: 'project', parentId: 'root' },
    { id: 'subpage', title: 'Escena', projectId: 'project', parentId: 'chapter' },
  ]))
  db.document.aggregate.mockResolvedValue({ _sum: { wordCount: 100 } })
  db.writingStats.groupBy.mockResolvedValue([])
})

describe('owned statistics scopes', () => {
  it('filters manuscript history and current counts by the full existing subtree', async () => {
    const result = await statsService.get('user', { documentId: 'root', days: 30 })
    expect(db.document.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: 'user', project: { userId: 'user' }, id: { in: ['root', 'chapter', 'subpage'] } }) }))
    expect(db.writingStats.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user', documentId: { in: ['root', 'chapter', 'subpage'] } } }))
    expect(result.summary.totalWords).toBe(100)
    expect(result.documents[1]?.parentId).toBe('root')
    expect(result.days).toHaveLength(30)
    expect(result.calendar.days).toHaveLength(365)
  })
  it('keeps deleted-document history in account and project totals', async () => {
    db.writingStats.groupBy.mockResolvedValue([{ day: '2026-09-12', _sum: { wordsAdded: 50, activeMilliseconds: 1000 } }])
    const result = await statsService.get('user', { projectId: 'project' })
    expect(db.writingStats.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user', projectId: 'project' } }))
    expect(result.trackedSince).toBe('2026-09-12')
  })
  it('rejects an incomplete date range before loading history', async () => {
    await expect(statsService.get('user', { from: '2026-09-01' })).rejects.toMatchObject({ statusCode: 400, code: 'STATS_INVALID_INPUT' })
    expect(db.writingStats.groupBy).not.toHaveBeenCalled()
  })
  it('rejects unknown or foreign filter ids before loading history', async () => {
    await expect(statsService.get('user', { documentId: 'foreign' })).rejects.toMatchObject({ statusCode: 404 })
    await expect(statsService.get('user', { projectId: 'foreign' })).rejects.toMatchObject({ statusCode: 404 })
    expect(db.writingStats.groupBy).not.toHaveBeenCalled()
  })
  it('rejects cross-project document filters', async () => {
    db.project.findMany.mockResolvedValue([{ id: 'project', name: 'A' }, { id: 'other', name: 'B' }])
    await expect(statsService.get('user', { projectId: 'other', documentId: 'root' })).rejects.toMatchObject({ statusCode: 404 })
  })
  it('counts uncached legacy contents in read-only mode without inventing activity', async () => {
    db.document.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'legacy', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'uno dos tres' }] }] } }])
    const result = await statsService.get('user', {})
    expect(result.summary.totalWords).toBe(103)
    expect(result.summary.wordsAdded).toBe(0)
    expect(result.trackedSince).toBeNull()
  })
  it('blocks a freshly revoked account before exposing names or statistics', async () => {
    db.user.findUnique.mockResolvedValue({ status: 'deleted', suspendedUntil: null })
    await expect(statsService.get('user', {})).rejects.toMatchObject({ statusCode: 403 })
    expect(db.project.findMany).not.toHaveBeenCalled()
  })
})
