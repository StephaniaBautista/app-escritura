export const AI_PROVIDERS = ['deepseek', 'mimo'] as const
export type AiProvider = typeof AI_PROVIDERS[number]

export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiCompletionInput {
  provider: AiProvider
  messages: AiMessage[]
  maxTokens?: number
  json?: boolean
  signal?: AbortSignal
}

export interface AiCompletion {
  content: string
  provider: AiProvider
  model: string
}

export const AI_MAX_INPUT_CHARS = 60_000
export const AI_MAX_OUTPUT_CHARS = 24_000
const MAX_RESPONSE_BYTES = 160_000
const DEFAULT_TIMEOUT_MS = 45_000

type AiErrorCode = 'AI_UNAVAILABLE' | 'AI_AUTHENTICATION_FAILED' | 'AI_INVALID_INPUT' | 'AI_RATE_LIMITED' | 'AI_TIMEOUT' | 'AI_PROVIDER_ERROR' | 'AI_INVALID_RESPONSE' | 'AI_CANCELLED'

export class AiClientError extends Error {
  constructor(public readonly code: AiErrorCode, public readonly statusCode: number) {
    super(code)
    this.name = 'AiClientError'
  }
}

const PROVIDERS = {
  deepseek: { url: 'https://api.deepseek.com/chat/completions', key: 'DEEPSEEK_API_KEY', model: 'DEEPSEEK_MODEL', defaultModel: 'deepseek-v4-flash' },
  mimo: { url: 'https://api.xiaomimimo.com/v1/chat/completions', key: 'MIMO_API_KEY', model: 'MIMO_MODEL', defaultModel: 'mimo-v2.5-pro' },
} as const

function providerConfig(provider: AiProvider) {
  const definition = PROVIDERS[provider]
  const apiKey = process.env[definition.key]?.trim()
  const model = process.env[definition.model]?.trim() || definition.defaultModel
  if (!apiKey || !/^[a-zA-Z0-9._:/-]{1,100}$/.test(model)) {
    throw new AiClientError('AI_UNAVAILABLE', 503)
  }
  return { ...definition, apiKey, model }
}

function validateInput(input: AiCompletionInput) {
  if (!AI_PROVIDERS.includes(input.provider) || !Array.isArray(input.messages)
    || input.messages.length < 1 || input.messages.length > 32
    || input.messages.some((message) => !['system', 'user', 'assistant'].includes(message.role)
      || typeof message.content !== 'string' || !message.content.trim())
    || input.messages.reduce((total, message) => total + message.content.length, 0) > AI_MAX_INPUT_CHARS
    || (input.maxTokens !== undefined && (!Number.isInteger(input.maxTokens) || input.maxTokens < 1 || input.maxTokens > 4096))) {
    throw new AiClientError('AI_INVALID_INPUT', 400)
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function readResponse(response: Response): Promise<unknown> {
  if (!response.body) throw new AiClientError('AI_INVALID_RESPONSE', 502)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let bytes = 0
  let text = ''
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break
      bytes += result.value.byteLength
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel()
        throw new AiClientError('AI_INVALID_RESPONSE', 502)
      }
      text += decoder.decode(result.value, { stream: true })
    }
    text += decoder.decode()
    return JSON.parse(text) as unknown
  } catch (error) {
    if (error instanceof AiClientError) throw error
    throw new AiClientError('AI_INVALID_RESPONSE', 502)
  } finally {
    reader.releaseLock()
  }
}

function extractContent(value: unknown, json: boolean): string {
  if (!isObject(value) || !Array.isArray(value.choices) || value.choices.length !== 1) {
    throw new AiClientError('AI_INVALID_RESPONSE', 502)
  }
  const choice: unknown = value.choices[0]
  if (!isObject(choice) || choice.finish_reason !== 'stop' || !isObject(choice.message)
    || choice.message.role !== 'assistant' || typeof choice.message.content !== 'string'
    || choice.message.tool_calls != null || choice.message.function_call != null) {
    throw new AiClientError('AI_INVALID_RESPONSE', 502)
  }
  const content = choice.message.content.trim()
  if (!content || content.length > AI_MAX_OUTPUT_CHARS) throw new AiClientError('AI_INVALID_RESPONSE', 502)
  if (json) {
    try {
      const parsed: unknown = JSON.parse(content)
      if (!isObject(parsed)) throw new Error()
    } catch {
      throw new AiClientError('AI_INVALID_RESPONSE', 502)
    }
  }
  return content
}

async function completeWithProvider(input: AiCompletionInput, provider: AiProvider): Promise<AiCompletion> {
  const config = providerConfig(provider)
  const controller = new AbortController()
  const timeout = Number(process.env.AI_TIMEOUT_MS)
  const timeoutMs = Number.isFinite(timeout) && timeout >= 1000 && timeout <= 90_000 ? timeout : DEFAULT_TIMEOUT_MS
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeoutMs)
  const cancel = () => controller.abort()
  input.signal?.addEventListener('abort', cancel, { once: true })
  if (input.signal?.aborted) controller.abort()
  try {
    const response = await fetch(config.url, {
      method: 'POST',
      redirect: 'error',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(provider === 'mimo' ? { 'api-key': config.apiKey } : { Authorization: `Bearer ${config.apiKey}` }),
      },
      body: JSON.stringify({
        model: config.model,
        messages: input.messages,
        stream: false,
        temperature: 0.4,
        thinking: { type: 'disabled' },
        ...(provider === 'mimo' ? { max_completion_tokens: input.maxTokens ?? 2048 } : { max_tokens: input.maxTokens ?? 2048 }),
        ...(input.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    })
    if (!response.ok) {
      await response.body?.cancel()
      if (response.status === 401 || response.status === 403) throw new AiClientError('AI_AUTHENTICATION_FAILED', 503)
      throw new AiClientError(response.status === 429 ? 'AI_RATE_LIMITED' : 'AI_PROVIDER_ERROR', response.status === 429 ? 429 : 502)
    }
    const content = extractContent(await readResponse(response), input.json === true)
    return { content, provider, model: config.model }
  } catch (error) {
    if (input.signal?.aborted) throw new AiClientError('AI_CANCELLED', 499)
    if (timedOut) throw new AiClientError('AI_TIMEOUT', 504)
    if (error instanceof AiClientError) throw error
    throw new AiClientError('AI_PROVIDER_ERROR', 502)
  } finally {
    clearTimeout(timer)
    input.signal?.removeEventListener('abort', cancel)
  }
}

export const aiClient = {
  status() {
    return {
      providers: AI_PROVIDERS.map((id) => {
        try {
          providerConfig(id)
          return { id, available: true }
        } catch {
          return { id, available: false }
        }
      }),
      fallbackEnabled: process.env.AI_FALLBACK_ENABLED === 'true',
    }
  },

  async complete(input: AiCompletionInput): Promise<AiCompletion> {
    validateInput(input)
    try {
      return await completeWithProvider(input, input.provider)
    } catch (error) {
      const fallback = input.provider === 'deepseek' ? 'mimo' : 'deepseek'
      const available = this.status().providers.find((provider) => provider.id === fallback)?.available
      if (!(error instanceof AiClientError) || !['AI_PROVIDER_ERROR', 'AI_RATE_LIMITED', 'AI_TIMEOUT'].includes(error.code)
        || process.env.AI_FALLBACK_ENABLED !== 'true' || !available) throw error
      return completeWithProvider(input, fallback)
    }
  },
}
