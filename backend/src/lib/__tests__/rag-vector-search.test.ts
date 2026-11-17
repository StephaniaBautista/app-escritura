import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $executeRawUnsafe: vi.fn(),
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
  },
}))

vi.mock('../prisma.js', () => ({ prisma: prismaMock }))
vi.mock('@generated/client', () => ({
  Prisma: { raw: (value: string) => value },
}))

import { EMBEDDING_DIMENSIONS } from '../ai-embeddings.js'
import { replaceDocumentChunks, searchSimilarChunks, vectorLiteral, VectorStoreError } from '../rag-vector-search.js'

const embedding = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.01)

describe('rag-vector-search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$executeRawUnsafe.mockResolvedValue(0)
    prismaMock.$executeRaw.mockResolvedValue(0)
    prismaMock.$queryRaw.mockResolvedValue([])
  })

  it('rejects malformed embeddings before touching SQL', () => {
    expect(() => vectorLiteral([1, 2, 3])).toThrow(VectorStoreError)
  })

  it('scopes similarity search by project and user', async () => {
    await searchSimilarChunks({ projectId: 'project-a', userId: 'user-1', embedding, limit: 8 })
    expect(prismaMock.$queryRaw).toHaveBeenCalled()
    const parts = prismaMock.$queryRaw.mock.calls[0] as unknown[]
    expect(JSON.stringify(parts)).toContain('project-a')
    expect(JSON.stringify(parts)).toContain('user-1')
    expect(JSON.stringify(parts)).not.toContain('project-b')
  })

  it('inserts chunks only for a single owned document', async () => {
    await replaceDocumentChunks([{
      id: 'c1', projectId: 'project-a', userId: 'user-1', documentId: 'doc-1', chunkIndex: 0,
      content: 'Alba llega.', contentHash: 'hash', sourceUpdatedAt: new Date('2026-01-01'), embedding,
    }])
    expect(prismaMock.$executeRaw).toHaveBeenCalled()
    await expect(replaceDocumentChunks([{
      id: 'c1', projectId: 'project-a', userId: 'user-1', documentId: 'doc-1', chunkIndex: 0,
      content: 'x', contentHash: 'hash', sourceUpdatedAt: new Date(), embedding,
    }, {
      id: 'c2', projectId: 'project-b', userId: 'user-1', documentId: 'doc-1', chunkIndex: 1,
      content: 'y', contentHash: 'hash', sourceUpdatedAt: new Date(), embedding,
    }])).rejects.toMatchObject({ code: 'AI_RAG_UNAVAILABLE' })
  })
})
