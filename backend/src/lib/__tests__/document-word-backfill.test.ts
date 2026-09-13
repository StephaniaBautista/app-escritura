import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@generated/client'
import { backfillDocumentWords } from '../document-word-backfill.js'

const document = { findMany: vi.fn(), updateMany: vi.fn() }
const db = { document } as unknown as Pick<Prisma.TransactionClient, 'document'>
const row = { id: 'legacy', updatedAt: new Date('2026-01-01'), content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'uno dos tres' }] }] } }

beforeEach(() => { vi.resetAllMocks(); document.findMany.mockResolvedValue([row]); document.updateMany.mockResolvedValue({ count: 1 }) })
describe('legacy word-count backfill', () => {
  it('defaults to a read-only aggregate report', async () => {
    expect(await backfillDocumentWords(db)).toEqual({ mode: 'dry-run', scanned: 1, updated: 0, skipped: 0, words: 3 })
    expect(document.updateMany).not.toHaveBeenCalled()
  })
  it('guards null count, identical timestamp and content while preserving modification time', async () => {
    expect(await backfillDocumentWords(db, true)).toMatchObject({ updated: 1 })
    expect(document.updateMany).toHaveBeenCalledWith({
      where: { id: row.id, wordCount: null, updatedAt: row.updatedAt, content: { equals: row.content } }, data: { wordCount: 3, updatedAt: row.updatedAt },
    })
  })
  it('skips a concurrently edited or already-counted document', async () => {
    document.updateMany.mockResolvedValue({ count: 0 })
    expect(await backfillDocumentWords(db, true)).toMatchObject({ updated: 0, skipped: 1 })
  })
})
