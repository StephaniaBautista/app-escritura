import { randomUUID } from 'node:crypto'
import { prisma } from './prisma.js'
import { embeddingsConfigured, embedTexts, EmbeddingError } from './ai-embeddings.js'
import { LONG_DOCUMENT_CHARS, plainDocumentText } from './rag-context.js'
import { chunkPlainText, documentContentHash } from './rag-chunks.js'
import { replaceDocumentChunks, VectorStoreError } from './rag-vector-search.js'

const MAX_DOCUMENTS = 400

function isIndexError(error: unknown): error is EmbeddingError | VectorStoreError {
  return error instanceof EmbeddingError || error instanceof VectorStoreError
}

async function ownedDocument(documentId: string, userId: string) {
  return prisma.document.findFirst({
    where: { id: documentId, userId, project: { userId } },
    select: { id: true, title: true, content: true, projectId: true, userId: true, updatedAt: true },
  })
}

export const ragIndexService = {
  async indexDocument(documentId: string, userId: string): Promise<void> {
    if (!embeddingsConfigured()) return
    const document = await ownedDocument(documentId, userId)
    if (!document) return
    const text = plainDocumentText(document.content, LONG_DOCUMENT_CHARS)
    const contentHash = documentContentHash(document.title, text)
    const existing = await prisma.aiDocumentChunk.findMany({
      where: { documentId: document.id, userId, projectId: document.projectId },
      select: { contentHash: true, chunkIndex: true },
      orderBy: { chunkIndex: 'asc' },
    })
    const chunks = chunkPlainText(text)
    if (existing.length === chunks.length && existing.every((row, index) => row.contentHash === contentHash && row.chunkIndex === index)) {
      return
    }
    await prisma.aiDocumentChunk.deleteMany({ where: { documentId: document.id, userId, projectId: document.projectId } })
    if (!chunks.length) return
    const embeddings = await embedTexts(chunks)
    await replaceDocumentChunks(chunks.map((content, chunkIndex) => ({
      id: randomUUID(),
      projectId: document.projectId,
      userId: document.userId,
      documentId: document.id,
      chunkIndex,
      content,
      contentHash,
      sourceUpdatedAt: document.updatedAt,
      embedding: embeddings[chunkIndex] ?? [],
    })))
  },

  async schedule(documentId: string, userId: string): Promise<void> {
    try {
      await ragIndexService.indexDocument(documentId, userId)
    } catch (error) {
      if (isIndexError(error)) return
      throw error
    }
  },

  async ensureProject(projectId: string, userId: string): Promise<void> {
    if (!embeddingsConfigured()) return
    const documents = await prisma.document.findMany({
      where: { projectId, userId, project: { userId } },
      select: { id: true, updatedAt: true },
      orderBy: { id: 'asc' },
      take: MAX_DOCUMENTS,
    })
    const indexed = await prisma.aiDocumentChunk.findMany({
      where: { projectId, userId },
      select: { documentId: true, sourceUpdatedAt: true },
    })
    const latest = new Map<string, number>()
    for (const row of indexed) {
      const current = latest.get(row.documentId) ?? 0
      const stamp = row.sourceUpdatedAt.getTime()
      if (stamp > current) latest.set(row.documentId, stamp)
    }
    const liveIds = new Set(documents.map((document) => document.id))
    const stale = documents.filter((document) => latest.get(document.id) !== document.updatedAt.getTime())
    for (const document of stale) {
      await ragIndexService.indexDocument(document.id, userId)
    }
    const orphans = [...latest.keys()].filter((id) => !liveIds.has(id))
    if (orphans.length) {
      await prisma.aiDocumentChunk.deleteMany({ where: { projectId, userId, documentId: { in: orphans } } })
    }
  },
}
