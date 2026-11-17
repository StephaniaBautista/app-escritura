import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, embedTextsMock, embeddingsConfiguredMock, replaceMock } = vi.hoisted(() => ({
  embeddingsConfiguredMock: vi.fn(() => true),
  embedTextsMock: vi.fn(),
  replaceMock: vi.fn(),
  prismaMock: {
    document: { findFirst: vi.fn(), findMany: vi.fn() },
    aiDocumentChunk: { findMany: vi.fn(), deleteMany: vi.fn() },
  },
}))

vi.mock('../prisma.js', () => ({ prisma: prismaMock }))
vi.mock('../ai-embeddings.js', () => ({
  embeddingsConfigured: embeddingsConfiguredMock,
  embedTexts: embedTextsMock,
  EmbeddingError: class EmbeddingError extends Error {},
}))
vi.mock('../rag-vector-search.js', () => ({
  replaceDocumentChunks: replaceMock,
  VectorStoreError: class VectorStoreError extends Error {},
}))

import { ragIndexService } from '../rag-index-service.js'

const tipTap = (value: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] })
const now = new Date('2026-09-13T12:00:00Z')
const embedding = Array.from({ length: 8 }, () => 0.2)

describe('ragIndexService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    embeddingsConfiguredMock.mockReturnValue(true)
    prismaMock.aiDocumentChunk.findMany.mockResolvedValue([])
    prismaMock.aiDocumentChunk.deleteMany.mockResolvedValue({ count: 0 })
    embedTextsMock.mockResolvedValue([embedding])
    replaceMock.mockResolvedValue(undefined)
  })

  it('reindexes when content changes and skips identical hashes', async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-1', title: 'Capítulo', content: tipTap('Alba llega a la plaza.'), projectId: 'project-1', userId: 'user-1', updatedAt: now,
    })
    await ragIndexService.indexDocument('doc-1', 'user-1')
    expect(prismaMock.document.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'doc-1', userId: 'user-1', project: { userId: 'user-1' } },
    }))
    expect(embedTextsMock).toHaveBeenCalledWith(['Alba llega a la plaza.'])
    expect(replaceMock).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({
      projectId: 'project-1', userId: 'user-1', documentId: 'doc-1', content: 'Alba llega a la plaza.',
    })]))

    prismaMock.aiDocumentChunk.findMany.mockResolvedValue([{ contentHash: (await replaceMock.mock.calls[0]![0][0]).contentHash, chunkIndex: 0 }])
    embedTextsMock.mockClear()
    replaceMock.mockClear()
    await ragIndexService.indexDocument('doc-1', 'user-1')
    expect(embedTextsMock).not.toHaveBeenCalled()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('removes chunks when the document is empty', async () => {
    prismaMock.aiDocumentChunk.findMany.mockResolvedValue([{ contentHash: 'old', chunkIndex: 0 }])
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-1', title: 'Vacío', content: tipTap(''), projectId: 'project-1', userId: 'user-1', updatedAt: now,
    })
    await ragIndexService.indexDocument('doc-1', 'user-1')
    expect(prismaMock.aiDocumentChunk.deleteMany).toHaveBeenCalledWith({
      where: { documentId: 'doc-1', userId: 'user-1', projectId: 'project-1' },
    })
    expect(embedTextsMock).not.toHaveBeenCalled()
  })

  it('does not index another user document', async () => {
    prismaMock.document.findFirst.mockResolvedValue(null)
    await ragIndexService.indexDocument('doc-1', 'user-1')
    expect(embedTextsMock).not.toHaveBeenCalled()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('backfills stale documents and deletes orphan chunks', async () => {
    prismaMock.document.findMany.mockResolvedValue([
      { id: 'doc-1', updatedAt: now },
      { id: 'doc-2', updatedAt: now },
    ])
    prismaMock.aiDocumentChunk.findMany.mockResolvedValue([
      { documentId: 'doc-1', sourceUpdatedAt: now },
      { documentId: 'gone', sourceUpdatedAt: now },
    ])
    prismaMock.document.findFirst.mockResolvedValue({
      id: 'doc-2', title: 'Nuevo', content: tipTap('Bruno aparece.'), projectId: 'project-1', userId: 'user-1', updatedAt: now,
    })
    await ragIndexService.ensureProject('project-1', 'user-1')
    expect(prismaMock.document.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { projectId: 'project-1', userId: 'user-1', project: { userId: 'user-1' } },
    }))
    expect(embedTextsMock).toHaveBeenCalledWith(['Bruno aparece.'])
    expect(prismaMock.aiDocumentChunk.deleteMany).toHaveBeenCalledWith({
      where: { projectId: 'project-1', userId: 'user-1', documentId: { in: ['gone'] } },
    })
  })
})
