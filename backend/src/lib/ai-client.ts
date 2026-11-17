import { extractTokenUsage, type AiTokenUsage } from './ai-tokens.js'
import {
  AI_PRESETS, isAiPreset, presetAvailable, resolvePreset, listPresetStatus,
  type AiPreset, type AiProvider, type AiVendor,
} from './ai-presets.js'

export { AI_PRESETS as AI_PROVIDERS, type AiPreset, type AiProvider, type AiVendor }

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
  vendor?: AiVendor
  model: string
  usage?: AiTokenUsage
}

export const AI_MAX_INPUT_CHARS = 60_000
export const AI_MAX_OUTPUT_CHARS = 400_000
export const AI_MAX_OUTPUT_TOKENS = 131_072
export const AI_REPAIR_INSTRUCTION = 'The response did not satisfy the required JSON contract. Answer the original request using the same supplied evidence and the exact JSON object schema in the system instructions. Start with { and end with }. Return JSON only, never whitespace, markdown or narrative prose. Use short strings, stay within every item and character limit, and include all required fields. For character suggestions, return only complete field/value/documentId/quote candidates with exact documentary evidence; omit entire ambiguous or non-actionable suggestions. Never invent evidence to satisfy the format.'
export const AI_REPAIR_RESERVE = AI_REPAIR_INSTRUCTION.length + 32
export const AI_EVIDENCE_INPUT_CHARS = 40_000
const MAX_RESPONSE_BYTES = 1_048_576
const DEFAULT_TIMEOUT_MS = 90_000

type AiErrorCode = 'AI_UNAVAILABLE' | 'AI_AUTHENTICATION_FAILED' | 'AI_INVALID_INPUT' | 'AI_RATE_LIMITED' | 'AI_TIMEOUT' | 'AI_PROVIDER_ERROR' | 'AI_INVALID_RESPONSE' | 'AI_CANCELLED'

export class AiClientError extends Error {
  constructor(public readonly code: AiErrorCode, public readonly statusCode: number) {
    super(code)
    this.name = 'AiClientError'
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateInput(input: AiCompletionInput) {
  if (!isAiPreset(input.provider) || !Array.isArray(input.messages)
    || input.messages.length < 1 || input.messages.length > 32
    || input.messages.some((message) => !['system', 'user', 'assistant'].includes(message.role)
      || typeof message.content !== 'string' || !message.content.trim())
    || input.messages.reduce((total, message) => total + message.content.length, 0) > AI_MAX_INPUT_CHARS
    || (input.maxTokens !== undefined && (!Number.isInteger(input.maxTokens) || input.maxTokens < 1 || input.maxTokens > AI_MAX_OUTPUT_TOKENS))) {
    throw new AiClientError('AI_INVALID_INPUT', 400)
  }
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

function messageContent(message: Record<string, unknown>): string | null {
  if (typeof message.content === 'string') return message.content
  if (!Array.isArray(message.content)) return null
  const parts = message.content.flatMap((part) => {
    if (!isObject(part) || typeof part.text !== 'string') return []
    return [part.text]
  })
  return parts.length ? parts.join('') : null
}

function extractContent(value: unknown, json: boolean): string {
  if (!isObject(value) || !Array.isArray(value.choices) || value.choices.length !== 1) {
    throw new AiClientError('AI_INVALID_RESPONSE', 502)
  }
  const choice: unknown = value.choices[0]
  if (!isObject(choice)
    || (choice.finish_reason !== 'stop' && choice.finish_reason !== undefined
      && !(choice.finish_reason === 'length' && json))
    || !isObject(choice.message) || choice.message.role !== 'assistant'
    || choice.message.tool_calls != null || choice.message.function_call != null) {
    throw new AiClientError('AI_INVALID_RESPONSE', 502)
  }
  const content = messageContent(choice.message)?.trim() ?? ''
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

function requestBody(input: AiCompletionInput, model: string, vendor: AiVendor, maxTokens: number) {
  const body: Record<string, unknown> = {
    model,
    messages: input.messages,
    stream: false,
    temperature: 0.4,
    [vendor === 'openai' || vendor === 'muse' ? 'max_completion_tokens' : 'max_tokens']: maxTokens,
  }
  if (vendor === 'deepseek') body.thinking = { type: 'disabled' }
  if (vendor === 'muse') body.reasoning_effort = input.json ? 'medium' : 'low'
  if (vendor === 'openai') {
    body.reasoning_effort = input.json ? 'medium' : 'max'
    body.store = false
  }
  if (input.json) body.response_format = { type: 'json_object' }
  return body
}

async function completeWithPreset(input: AiCompletionInput, preset: AiPreset): Promise<AiCompletion> {
  if (!presetAvailable(preset)) throw new AiClientError('AI_UNAVAILABLE', 503)
  const config = resolvePreset(preset)
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
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody(input, config.model, config.vendor, input.maxTokens ?? 2048)),
    })
    if (!response.ok) {
      await response.body?.cancel()
      if (response.status === 401 || response.status === 403) throw new AiClientError('AI_AUTHENTICATION_FAILED', 503)
      throw new AiClientError(response.status === 429 ? 'AI_RATE_LIMITED' : 'AI_PROVIDER_ERROR', response.status === 429 ? 429 : 502)
    }
    const payload = await readResponse(response)
    const content = extractContent(payload, input.json === true)
    return {
      content, provider: preset, vendor: config.vendor, model: config.model, usage: extractTokenUsage(payload),
    }
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
      providers: listPresetStatus(),
      fallbackEnabled: false,
    }
  },

  async complete(input: AiCompletionInput): Promise<AiCompletion> {
    validateInput(input)
    if (!presetAvailable(input.provider)) throw new AiClientError('AI_UNAVAILABLE', 503)
    return completeWithPreset(input, input.provider)
  },
}
