import { aiClient, AiClientError, type AiCompletionInput } from '../lib/ai-client.js'
import type { AiGenerationBudget } from './ai-access.js'
import { AiServiceError } from './ai-types.js'

const repairInstruction = 'The response did not satisfy the required JSON contract. Answer the original request using the same supplied evidence and the exact JSON object schema in the system instructions. Start with { and end with }. Return JSON only, never whitespace, markdown or narrative prose. Use short strings, stay within every item and character limit, and include all required fields. For character suggestions, return only complete field/value/documentId/quote candidates with exact documentary evidence; omit entire ambiguous or non-actionable suggestions. Never invent evidence to satisfy the format.'

export async function generateValidated<T>(
  input: Omit<AiCompletionInput, 'signal'>,
  budget: AiGenerationBudget,
  validate: (content: string) => T,
) {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (budget.signal.aborted) throw new AiServiceError('AI_TIMEOUT', 504)
    try {
      const completion = await aiClient.complete({
        ...input, signal: budget.signal,
        messages: attempt === 0 ? input.messages : [...input.messages, { role: 'user', content: repairInstruction }],
      })
      if (budget.signal.aborted) throw new AiServiceError('AI_TIMEOUT', 504)
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
