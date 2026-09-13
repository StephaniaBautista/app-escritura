import { beforeEach, describe, expect, it, vi } from 'vitest'
const { complete } = vi.hoisted(() => ({ complete: vi.fn() }))
vi.mock('../../lib/ai-client.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/ai-client.js')>()), aiClient: { complete },
}))
import { AiClientError } from '../../lib/ai-client.js'
import { generateValidated } from '../ai-generation.js'
import { parseChatResponse } from '../ai-output.js'
import { AiServiceError } from '../ai-types.js'

const input = { provider: 'deepseek' as const, json: true, messages: [{ role: 'system' as const, content: 'Return JSON observations/questions/nextSteps.' }, { role: 'user' as const, content: 'Give structural advice about Ada.' }] }
const valid = { provider: 'deepseek' as const, model: 'test', content: '{"observations":["An existing conflict."],"questions":[],"nextSteps":[]}' }
const validate = (content: string) => parseChatResponse(content, 'adviser')

beforeEach(() => { vi.clearAllMocks(); complete.mockResolvedValue(valid) })

describe('bounded AI response repair', () => {
  it('repairs whitespace-only output once without forwarding the invalid reply', async () => {
    complete.mockRejectedValueOnce(new AiClientError('AI_INVALID_RESPONSE', 502))
    const consumeRetry = vi.fn().mockResolvedValue(undefined)
    const signal = new AbortController().signal
    const result = await generateValidated(input, { signal, consumeRetry }, validate)
    expect(result.value).toBe('• An existing conflict.')
    expect(consumeRetry).toHaveBeenCalledTimes(1)
    expect(complete).toHaveBeenCalledTimes(2)
    expect(complete.mock.calls[0][0].signal).toBe(signal)
    expect(complete.mock.calls[1][0].signal).toBe(signal)
    expect(complete.mock.calls[1][0].messages).toHaveLength(3)
    expect(complete.mock.calls[1][0].messages[2].content).toContain('never whitespace')
  })
  it('stops after a second invalid output and never loops until valid', async () => {
    complete.mockResolvedValue({ ...valid, content: ' '.repeat(429) })
    const consumeRetry = vi.fn().mockResolvedValue(undefined)
    await expect(generateValidated(input, { signal: new AbortController().signal, consumeRetry }, validate)).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' })
    expect(complete).toHaveBeenCalledTimes(2)
    expect(consumeRetry).toHaveBeenCalledTimes(1)
  })
  it('does not call the provider again when the extra quota cannot be reserved', async () => {
    complete.mockRejectedValueOnce(new AiClientError('AI_INVALID_RESPONSE', 502))
    const consumeRetry = vi.fn().mockRejectedValue(new AiServiceError('AI_RATE_LIMITED', 429))
    await expect(generateValidated(input, { signal: new AbortController().signal, consumeRetry }, validate)).rejects.toMatchObject({ code: 'AI_RATE_LIMITED' })
    expect(complete).toHaveBeenCalledTimes(1)
  })
  it('enforces the same overall deadline through repair and provider fallback', async () => {
    const controller = new AbortController()
    complete.mockImplementationOnce(async () => { controller.abort(); throw new AiClientError('AI_INVALID_RESPONSE', 502) })
    const consumeRetry = vi.fn()
    await expect(generateValidated(input, { signal: controller.signal, consumeRetry }, validate)).rejects.toMatchObject({ code: 'AI_TIMEOUT', statusCode: 504 })
    expect(complete).toHaveBeenCalledTimes(1)
    expect(consumeRetry).not.toHaveBeenCalled()
  })
  it('never starts a call after the shared deadline', async () => {
    const controller = new AbortController(); controller.abort()
    await expect(generateValidated(input, { signal: controller.signal, consumeRetry: vi.fn() }, validate)).rejects.toMatchObject({ code: 'AI_TIMEOUT' })
    expect(complete).not.toHaveBeenCalled()
  })
  it.each([new AiClientError('AI_AUTHENTICATION_FAILED', 503), new AiClientError('AI_RATE_LIMITED', 429), new AiClientError('AI_PROVIDER_ERROR', 502)])('does not retry unrelated provider failures', async (failure) => {
    complete.mockRejectedValue(failure)
    const consumeRetry = vi.fn()
    await expect(generateValidated(input, { signal: new AbortController().signal, consumeRetry }, validate)).rejects.toBe(failure)
    expect(complete).toHaveBeenCalledTimes(1)
    expect(consumeRetry).not.toHaveBeenCalled()
  })
})
