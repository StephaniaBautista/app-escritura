import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aiClient, AiClientError, AI_MAX_INPUT_CHARS } from '../ai-client.js'

const fetchMock = vi.fn<typeof fetch>()
const messages = [{ role: 'user' as const, content: 'Help me consider my character’s motivation.' }]
const completion = (content = 'Consider what your character stands to lose.') => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content, tool_calls: null, function_call: null } }] }), { status: 200 })

describe('aiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    vi.stubEnv('DEEPSEEK_API_KEY', 'test-deepseek-key')
    vi.stubEnv('MIMO_API_KEY', 'test-mimo-key')
    vi.stubEnv('DEEPSEEK_MODEL', '')
    vi.stubEnv('MIMO_MODEL', '')
    vi.stubEnv('AI_FALLBACK_ENABLED', '')
    vi.stubEnv('AI_TIMEOUT_MS', '')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('sends DeepSeek only to its fixed HTTPS endpoint and never returns its key', async () => {
    fetchMock.mockResolvedValue(completion())
    const result = await aiClient.complete({ provider: 'deepseek', messages })
    expect(result).toEqual({ content: 'Consider what your character stands to lose.', provider: 'deepseek', model: 'deepseek-v4-flash' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.deepseek.com/chat/completions')
    expect(init).toMatchObject({ redirect: 'error', method: 'POST', headers: { Authorization: 'Bearer test-deepseek-key' } })
    expect(JSON.parse(String(init?.body))).toMatchObject({ stream: false, max_tokens: 2048, thinking: { type: 'disabled' } })
    expect(JSON.stringify(result)).not.toContain('test-deepseek-key')
  })

  it('uses MiMo api-key and completion token field with structured JSON', async () => {
    fetchMock.mockResolvedValue(completion('{"observations":[]}'))
    await aiClient.complete({ provider: 'mimo', messages, json: true, maxTokens: 512 })
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.xiaomimimo.com/v1/chat/completions')
    const init = fetchMock.mock.calls[0][1]
    expect(init?.headers).toMatchObject({ 'api-key': 'test-mimo-key' })
    expect(JSON.parse(String(init?.body))).toMatchObject({ model: 'mimo-v2.5-pro', max_completion_tokens: 512, response_format: { type: 'json_object' }, thinking: { type: 'disabled' } })
    expect(JSON.parse(String(init?.body))).not.toHaveProperty('max_tokens')
  })

  it('supports configured provider model names without arbitrary URLs', async () => {
    vi.stubEnv('DEEPSEEK_MODEL', 'deepseek-v4-pro')
    vi.stubEnv('DEEPSEEK_BASE_URL', 'http://localhost/secrets')
    fetchMock.mockResolvedValue(completion())
    expect((await aiClient.complete({ provider: 'deepseek', messages })).model).toBe('deepseek-v4-pro')
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.deepseek.com/chat/completions')
  })

  it('reports missing and malformed configuration without secrets', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', '')
    vi.stubEnv('MIMO_MODEL', 'invalid\nmodel')
    expect(aiClient.status()).toEqual({ providers: [{ id: 'deepseek', available: false }, { id: 'mimo', available: false }], fallbackEnabled: false })
    await expect(aiClient.complete({ provider: 'deepseek', messages })).rejects.toMatchObject({ code: 'AI_UNAVAILABLE', statusCode: 503 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('bounds input, message count and requested output tokens before network access', async () => {
    const cases = [
      { messages: [{ role: 'user' as const, content: 'x'.repeat(AI_MAX_INPUT_CHARS + 1) }] },
      { messages: Array.from({ length: 33 }, () => messages[0]) },
      { messages: [] },
      { messages: [{ role: 'user' as const, content: '   ' }] },
      { messages, maxTokens: 4097 },
      { messages, maxTokens: 0 },
      { messages, maxTokens: 1.5 },
    ]
    for (const input of cases) await expect(aiClient.complete({ provider: 'deepseek', ...input })).rejects.toMatchObject({ code: 'AI_INVALID_INPUT' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([401, 403])('sanitizes authentication failure %i and never falls back', async (status) => {
    vi.stubEnv('AI_FALLBACK_ENABLED', 'true')
    fetchMock.mockResolvedValue(new Response('Invalid test-deepseek-key; account test@example.com', { status }))
    await expect(aiClient.complete({ provider: 'deepseek', messages })).rejects.toMatchObject({ code: 'AI_AUTHENTICATION_FAILED', message: 'AI_AUTHENTICATION_FAILED', statusCode: 503 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps provider failure private and does not silently share with another vendor', async () => {
    fetchMock.mockRejectedValue(new Error('Request to test-deepseek-key leaked detail'))
    await expect(aiClient.complete({ provider: 'deepseek', messages })).rejects.toMatchObject({ message: 'AI_PROVIDER_ERROR', code: 'AI_PROVIDER_ERROR', statusCode: 502 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back once only when explicitly enabled', async () => {
    vi.stubEnv('AI_FALLBACK_ENABLED', 'true')
    fetchMock.mockResolvedValueOnce(new Response('rate limited', { status: 429 })).mockResolvedValueOnce(completion())
    const result = await aiClient.complete({ provider: 'deepseek', messages })
    expect(result.provider).toBe('mimo')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not loop when both providers fail', async () => {
    vi.stubEnv('AI_FALLBACK_ENABLED', 'true')
    fetchMock.mockResolvedValue(new Response('', { status: 503 }))
    await expect(aiClient.complete({ provider: 'deepseek', messages })).rejects.toBeInstanceOf(AiClientError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not fallback when the alternative is unconfigured', async () => {
    vi.stubEnv('AI_FALLBACK_ENABLED', 'true')
    vi.stubEnv('MIMO_API_KEY', '')
    fetchMock.mockResolvedValue(new Response('', { status: 429 }))
    await expect(aiClient.complete({ provider: 'deepseek', messages })).rejects.toMatchObject({ code: 'AI_RATE_LIMITED' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('cancels stalled network calls with a sanitized timeout', async () => {
    vi.useFakeTimers()
    vi.stubEnv('AI_TIMEOUT_MS', '1000')
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('private timeout details', 'AbortError')))
    }))
    const request = expect(aiClient.complete({ provider: 'deepseek', messages })).rejects.toMatchObject({ code: 'AI_TIMEOUT', statusCode: 504 })
    await vi.advanceTimersByTimeAsync(1001)
    await request
  })

  it('honors caller cancellation without fallback', async () => {
    vi.stubEnv('AI_FALLBACK_ENABLED', 'true')
    const controller = new AbortController()
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    }))
    const request = expect(aiClient.complete({ provider: 'deepseek', messages, signal: controller.signal })).rejects.toMatchObject({ code: 'AI_CANCELLED' })
    controller.abort()
    await request
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([
    { choices: [] },
    { choices: [{ finish_reason: 'length', message: { role: 'assistant', content: 'truncated' } }] },
    { choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: 42 } }] },
    { choices: [{ finish_reason: 'stop', message: { role: 'user', content: 'text' } }] },
    { choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: 'text', tool_calls: [{ function: 'write' }] } }] },
  ])('rejects invalid, truncated or tool output %#', async (payload) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(payload)))
    await expect(aiClient.complete({ provider: 'deepseek', messages })).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' })
  })

  it.each(['not json', '[]', 'null', '{"broken":'])('rejects invalid structured response %s', async (content) => {
    fetchMock.mockResolvedValue(completion(content))
    await expect(aiClient.complete({ provider: 'deepseek', messages, json: true })).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' })
  })

  it('bounds response bytes before parsing', async () => {
    fetchMock.mockResolvedValue(new Response('x'.repeat(160_001)))
    await expect(aiClient.complete({ provider: 'deepseek', messages })).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' })
  })

  it('rejects blank or excessively long completion content', async () => {
    for (const content of ['   ', 'x'.repeat(24_001)]) {
      fetchMock.mockResolvedValueOnce(completion(content))
      await expect(aiClient.complete({ provider: 'deepseek', messages })).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' })
    }
  })
})
