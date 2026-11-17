const DEFAULT_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536
const MAX_BATCH = 64
const DEFAULT_TIMEOUT_MS = 45_000

export class EmbeddingError extends Error {
  constructor(public readonly code: 'AI_RAG_UNAVAILABLE' | 'AI_AUTHENTICATION_FAILED', public readonly statusCode: number) {
    super(code)
    this.name = 'EmbeddingError'
  }
}

export function embeddingsConfigured(): boolean {
  return Boolean(ragApiKey())
}

function ragApiKey(): string {
  return process.env.RAG_API_KEY?.trim() ?? ''
}

export function embeddingModel(): string {
  return process.env.OPENAI_EMBEDDING_MODEL?.trim() || DEFAULT_MODEL
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseVectors(payload: unknown, expected: number): number[][] {
  if (!isObject(payload) || !Array.isArray(payload.data) || payload.data.length !== expected) {
    throw new EmbeddingError('AI_RAG_UNAVAILABLE', 503)
  }
  const ranked = [...payload.data].sort((left, right) => {
    const a = isObject(left) && typeof left.index === 'number' ? left.index : 0
    const b = isObject(right) && typeof right.index === 'number' ? right.index : 0
    return a - b
  })
  return ranked.map((item) => {
    if (!isObject(item) || !Array.isArray(item.embedding) || item.embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new EmbeddingError('AI_RAG_UNAVAILABLE', 503)
    }
    const vector = item.embedding.map((value) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new EmbeddingError('AI_RAG_UNAVAILABLE', 503)
      return value
    })
    return vector
  })
}

async function embedBatch(texts: string[], signal: AbortSignal): Promise<number[][]> {
  const apiKey = ragApiKey()
  if (!apiKey) throw new EmbeddingError('AI_RAG_UNAVAILABLE', 503)
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    redirect: 'error',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: embeddingModel(), input: texts }),
  })
  if (!response.ok) {
    await response.body?.cancel()
    if (response.status === 401 || response.status === 403) throw new EmbeddingError('AI_AUTHENTICATION_FAILED', 503)
    throw new EmbeddingError('AI_RAG_UNAVAILABLE', 503)
  }
  const payload: unknown = await response.json()
  return parseVectors(payload, texts.length)
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return []
  if (!embeddingsConfigured()) throw new EmbeddingError('AI_RAG_UNAVAILABLE', 503)
  const vectors: number[][] = []
  const timeout = Number(process.env.AI_TIMEOUT_MS)
  const timeoutMs = Number.isFinite(timeout) && timeout >= 1000 && timeout <= 90_000 ? timeout : DEFAULT_TIMEOUT_MS
  for (let offset = 0; offset < texts.length; offset += MAX_BATCH) {
    const batch = texts.slice(offset, offset + MAX_BATCH)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      vectors.push(...await embedBatch(batch, controller.signal))
    } catch (error) {
      if (error instanceof EmbeddingError) throw error
      throw new EmbeddingError('AI_RAG_UNAVAILABLE', 503)
    } finally {
      clearTimeout(timer)
    }
  }
  return vectors
}
