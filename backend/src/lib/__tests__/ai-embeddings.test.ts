import { afterEach, describe, expect, it, vi } from 'vitest'
import { embedTexts, embeddingsConfigured, EmbeddingError } from '../ai-embeddings.js'

describe('ai-embeddings', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('is configured only when RAG_API_KEY is present', () => {
    vi.stubEnv('RAG_API_KEY', '')
    expect(embeddingsConfigured()).toBe(false)
    vi.stubEnv('RAG_API_KEY', 'sk-test')
    expect(embeddingsConfigured()).toBe(true)
  })

  it('returns vectors aligned to the input order', async () => {
    vi.stubEnv('RAG_API_KEY', 'sk-test')
    const embedding = Array.from({ length: 1536 }, (_, index) => index * 0.001)
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [{ index: 1, embedding }, { index: 0, embedding }] }),
    })))
    const result = await embedTexts(['first', 'second'])
    expect(result).toHaveLength(2)
    expect(result[0]).toHaveLength(1536)
    expect(fetch).toHaveBeenCalledWith('https://api.openai.com/v1/embeddings', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer sk-test' }),
    }))
  })

  it('fails closed on authentication errors', async () => {
    vi.stubEnv('RAG_API_KEY', 'sk-test')
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, body: { cancel: async () => undefined } })))
    await expect(embedTexts(['hola'])).rejects.toMatchObject({ code: 'AI_AUTHENTICATION_FAILED', statusCode: 503 })
    expect(EmbeddingError).toBeDefined()
  })
})
