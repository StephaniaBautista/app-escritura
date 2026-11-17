import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aiClient, AiClientError, AI_MAX_INPUT_CHARS } from '../ai-client.js'

const fetchMock = vi.fn<typeof fetch>()
const messages = [{ role: 'user' as const, content: 'Help me consider my character’s motivation.' }]
const completion = (content = 'Consider what your character stands to lose.', extra: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({
    choices: [{ finish_reason: 'stop', message: { role: 'assistant', content, tool_calls: null, function_call: null } }],
    usage: { prompt_tokens: 12, completion_tokens: 8, ...extra },
  }), { status: 200 })

describe('aiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    vi.stubEnv('DEEPSEEK_API_KEY', 'test-deepseek-key')
    vi.stubEnv('MUSE_API_KEY', 'test-muse-key')
    vi.stubEnv('GLM_API_KEY', 'test-glm-key')
    vi.stubEnv('OPENAI_API_KEY', 'test-openai-key')
    vi.stubEnv('DEEPSEEK_MODEL', '')
    vi.stubEnv('MUSE_CONTRIBUTOR_MODEL', '')
    vi.stubEnv('MUSE_STANDARD_MODEL', '')
    vi.stubEnv('GLM_MODEL', '')
    vi.stubEnv('OPENAI_MODEL', '')
    vi.stubEnv('AI_TIMEOUT_MS', '')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('sends the balanced mode only to DeepSeek HTTPS and never returns its key', async () => {
    fetchMock.mockResolvedValue(completion())
    const result = await aiClient.complete({ provider: 'balanced', messages })
    expect(result).toMatchObject({
      content: 'Consider what your character stands to lose.',
      provider: 'balanced',
      vendor: 'deepseek',
      model: 'deepseek-flash',
      usage: { promptTokens: 12, completionTokens: 8 },
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.deepseek.com/chat/completions')
    expect(init).toMatchObject({ redirect: 'error', method: 'POST', headers: { Authorization: 'Bearer test-deepseek-key' } })
    expect(JSON.parse(String(init?.body))).toMatchObject({ stream: false, max_tokens: 2048, thinking: { type: 'disabled' } })
    expect(JSON.stringify(result)).not.toContain('test-deepseek-key')
  })

  it('uses Muse completion tokens for saver', async () => {
    fetchMock.mockResolvedValue(completion('{"observations":[]}'))
    await aiClient.complete({ provider: 'saver', messages, json: true, maxTokens: 512 })
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.meta.ai/v1/chat/completions')
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      model: 'muse-spark-1.3-contributor', max_completion_tokens: 512, response_format: { type: 'json_object' },
    })
  })

  it('sends the private mode to OpenAI with store disabled', async () => {
    fetchMock.mockResolvedValue(completion())
    const result = await aiClient.complete({ provider: 'private', messages })
    expect(result).toMatchObject({ provider: 'private', vendor: 'openai', model: 'gpt-5.6-luna' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect(init).toMatchObject({ redirect: 'error', method: 'POST', headers: { Authorization: 'Bearer test-openai-key' } })
    expect(JSON.parse(String(init?.body))).toMatchObject({
      stream: false, store: false, max_completion_tokens: 2048, reasoning_effort: 'max',
    })
    expect(JSON.stringify(result)).not.toContain('test-openai-key')
    expect(aiClient.status().providers.find((item) => item.id === 'private')).toEqual({
      id: 'private', available: true, trainsData: false, comingSoon: false,
    })
  })

  it('does not call OpenAI for private when the key is missing', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    await expect(aiClient.complete({ provider: 'private', messages })).rejects.toMatchObject({ code: 'AI_UNAVAILABLE', statusCode: 503 })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(aiClient.status().providers.find((item) => item.id === 'private')).toEqual({
      id: 'private', available: false, trainsData: false, comingSoon: false,
    })
  })

  it('keeps vendor URLs fixed even if a base URL env is injected', async () => {
    vi.stubEnv('DEEPSEEK_MODEL', 'deepseek-flash')
    vi.stubEnv('DEEPSEEK_BASE_URL', 'http://localhost/secrets')
    fetchMock.mockResolvedValue(completion())
    expect((await aiClient.complete({ provider: 'balanced', messages })).model).toBe('deepseek-flash')
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.deepseek.com/chat/completions')
  })

  it('reports missing configuration without secrets', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', '')
    vi.stubEnv('MUSE_API_KEY', '')
    vi.stubEnv('GLM_API_KEY', '')
    vi.stubEnv('OPENAI_API_KEY', '')
    expect(aiClient.status().providers.every((item) => item.available === false)).toBe(true)
    await expect(aiClient.complete({ provider: 'balanced', messages })).rejects.toMatchObject({ code: 'AI_UNAVAILABLE', statusCode: 503 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('bounds input, message count and requested output tokens before network access', async () => {
    const cases = [
      { messages: [{ role: 'user' as const, content: 'x'.repeat(AI_MAX_INPUT_CHARS + 1) }] },
      { messages: Array.from({ length: 33 }, () => messages[0]) },
      { messages: [] },
      { messages: [{ role: 'user' as const, content: '   ' }] },
      { messages, maxTokens: 131_073 },
      { messages, maxTokens: 0 },
      { messages, maxTokens: 1.5 },
    ]
    for (const input of cases) await expect(aiClient.complete({ provider: 'balanced', ...input })).rejects.toMatchObject({ code: 'AI_INVALID_INPUT' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([401, 403])('sanitizes authentication failure %i', async (status) => {
    fetchMock.mockResolvedValue(new Response('Invalid test-deepseek-key; account test@example.com', { status }))
    await expect(aiClient.complete({ provider: 'balanced', messages })).rejects.toMatchObject({ code: 'AI_AUTHENTICATION_FAILED', message: 'AI_AUTHENTICATION_FAILED', statusCode: 503 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never falls back to another vendor', async () => {
    fetchMock.mockRejectedValue(new Error('Request to test-deepseek-key leaked detail'))
    await expect(aiClient.complete({ provider: 'balanced', messages })).rejects.toMatchObject({ message: 'AI_PROVIDER_ERROR', code: 'AI_PROVIDER_ERROR', statusCode: 502 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('cancels stalled network calls with a sanitized timeout', async () => {
    vi.useFakeTimers()
    vi.stubEnv('AI_TIMEOUT_MS', '1000')
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('private timeout details', 'AbortError')))
    }))
    const request = expect(aiClient.complete({ provider: 'balanced', messages })).rejects.toMatchObject({ code: 'AI_TIMEOUT', statusCode: 504 })
    await vi.advanceTimersByTimeAsync(1001)
    await request
  })

  it('honors caller cancellation', async () => {
    const controller = new AbortController()
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    }))
    const request = expect(aiClient.complete({ provider: 'balanced', messages, signal: controller.signal })).rejects.toMatchObject({ code: 'AI_CANCELLED' })
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
    await expect(aiClient.complete({ provider: 'balanced', messages })).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' })
  })

  it('accepts a truncated finish_reason only when structured JSON still parses', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      choices: [{ finish_reason: 'length', message: { role: 'assistant', content: '{"ok":true}' } }],
    })))
    await expect(aiClient.complete({ provider: 'balanced', messages, json: true })).resolves.toMatchObject({ content: '{"ok":true}' })
  })

  it.each(['not json', '[]', 'null', '{"broken":'])('rejects invalid structured response %s', async (content) => {
    fetchMock.mockResolvedValue(completion(content))
    await expect(aiClient.complete({ provider: 'balanced', messages, json: true })).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' })
  })

  it('bounds response bytes before parsing', async () => {
    fetchMock.mockResolvedValue(new Response('x'.repeat(1_048_577)))
    await expect(aiClient.complete({ provider: 'balanced', messages })).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' })
  })

  it('rejects blank or excessively long completion content', async () => {
    for (const content of ['   ', 'x'.repeat(400_001)]) {
      fetchMock.mockResolvedValueOnce(completion(content))
      await expect(aiClient.complete({ provider: 'balanced', messages })).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' })
    }
  })
})
