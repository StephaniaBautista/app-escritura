import { Prisma } from '@generated/client'
import { prisma } from './prisma.js'
import { EMBEDDING_DIMENSIONS } from './ai-embeddings.js'

export interface VectorChunkRow {
  id: string
  documentId: string
  chunkIndex: number
  content: string
}

export interface ChunkWrite {
  id: string
  projectId: string
  userId: string
  documentId: string
  chunkIndex: number
  content: string
  contentHash: string
  sourceUpdatedAt: Date
  embedding: number[]
}

export class VectorStoreError extends Error {
  constructor(public readonly code: 'AI_RAG_UNAVAILABLE', public readonly statusCode: number) {
    super(code)
    this.name = 'VectorStoreError'
  }
}

let ready = false

export function vectorLiteral(values: number[]): string {
  if (values.length !== EMBEDDING_DIMENSIONS || values.some((value) => !Number.isFinite(value))) {
    throw new VectorStoreError('AI_RAG_UNAVAILABLE', 503)
  }
  return `[${values.join(',')}]`
}

export async function ensureVectorExtension(): Promise<void> {
  if (ready) return
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector')
    try {
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS ai_document_chunks_embedding_hnsw ON ai_document_chunks USING hnsw (embedding vector_cosine_ops)',
      )
    } catch {
      void 0
    }
    ready = true
  } catch {
    throw new VectorStoreError('AI_RAG_UNAVAILABLE', 503)
  }
}

export async function replaceDocumentChunks(chunks: ChunkWrite[]): Promise<void> {
  if (!chunks.length) return
  const first = chunks[0]!
  if (chunks.some((chunk) => chunk.documentId !== first.documentId || chunk.userId !== first.userId || chunk.projectId !== first.projectId)) {
    throw new VectorStoreError('AI_RAG_UNAVAILABLE', 503)
  }
  await ensureVectorExtension()
  for (const chunk of chunks) {
    const embedding = Prisma.raw(`'${vectorLiteral(chunk.embedding)}'::vector`)
    await prisma.$executeRaw`
      INSERT INTO ai_document_chunks
        (id, "projectId", "userId", "documentId", "chunkIndex", content, "contentHash", "sourceUpdatedAt", embedding, "createdAt", "updatedAt")
      VALUES
        (${chunk.id}, ${chunk.projectId}, ${chunk.userId}, ${chunk.documentId}, ${chunk.chunkIndex}, ${chunk.content}, ${chunk.contentHash}, ${chunk.sourceUpdatedAt}, ${embedding}, NOW(), NOW())
    `
  }
}

export async function searchSimilarChunks(input: {
  projectId: string
  userId: string
  embedding: number[]
  limit: number
}): Promise<VectorChunkRow[]> {
  if (!input.projectId || !input.userId || input.limit < 1 || input.limit > 50) {
    throw new VectorStoreError('AI_RAG_UNAVAILABLE', 503)
  }
  await ensureVectorExtension()
  const embedding = Prisma.raw(`'${vectorLiteral(input.embedding)}'::vector`)
  try {
    return await prisma.$queryRaw<VectorChunkRow[]>`
      SELECT id, "documentId", "chunkIndex", content
      FROM ai_document_chunks
      WHERE "projectId" = ${input.projectId} AND "userId" = ${input.userId}
      ORDER BY embedding <=> ${embedding}
      LIMIT ${input.limit}
    `
  } catch {
    throw new VectorStoreError('AI_RAG_UNAVAILABLE', 503)
  }
}
