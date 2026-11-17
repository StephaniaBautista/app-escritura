import { aiClient, AiClientError, AI_MAX_INPUT_CHARS, AI_REPAIR_INSTRUCTION, type AiCompletionInput } from '../lib/ai-client.js'
import { recordAiUsage } from '../lib/ai-usage.js'
import type { AiGenerationBudget } from './ai-access.js'
import { AiServiceError } from './ai-types.js'

function withRepairInstruction(messages: AiCompletionInput['messages']): AiCompletionInput['messages'] {
  const total = messages.reduce((sum, message) => sum + message.content.length, 0)
  if (total + AI_REPAIR_INSTRUCTION.length + 1 > AI_MAX_INPUT_CHARS) return messages
  return [...messages, { role: 'user', content: AI_REPAIR_INSTRUCTION }]
}

export async function generateValidated<T>(
  input: Omit<AiCompletionInput, 'signal'> & { userId?: string },
  budget: AiGenerationBudget,
  validate: (content: string) => T,
) {
  const { userId, ...completionInput } = input
  for (let attempt = 0; attempt < 2; attempt++) {
    if (budget.signal.aborted) throw new AiServiceError('AI_TIMEOUT', 504)
    try {
      const completion = await aiClient.complete({
        ...completionInput, signal: budget.signal,
        messages: attempt === 0 ? completionInput.messages : withRepairInstruction(completionInput.messages),
      })
      if (budget.signal.aborted) throw new AiServiceError('AI_TIMEOUT', 504)
      if (userId && completion.vendor) {
        await recordAiUsage({
          userId,
          preset: completion.provider,
          vendor: completion.vendor,
          model: completion.model,
          promptTokens: completion.usage?.promptTokens ?? 0,
          completionTokens: completion.usage?.completionTokens ?? 0,
        }).catch(() => undefined)
      }
      return { completion, value: validate(completion.content) }
    } catch (error) {
      if (budget.signal.aborted) throw new AiServiceError('AI_TIMEOUT', 504)
      const invalidResponse = (error instanceof AiClientError || error instanceof AiServiceError) && error.code === 'AI_INVALID_RESPONSE'
      if (!invalidResponse || attempt === 1) throw error
      await budget.consumeRetry()
    }
  }
  throw new AiServiceError('AI_INVALID_RESPONSE', 502)
}
