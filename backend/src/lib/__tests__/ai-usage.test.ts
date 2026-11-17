import { describe, expect, it } from 'vitest'
import { estimateCostMicros, microsToUsd } from '../ai-pricing.js'
import { extractTokenUsage } from '../ai-tokens.js'
import { sanitizeDismissedTrainingModes } from '../ai-presets.js'

describe('AI usage helpers', () => {
  it('prices DeepSeek peak and Muse contributor separately', () => {
    expect(estimateCostMicros('deepseek-flash', 'deepseek', 1_000_000, 1_000_000)).toBe(700_000)
    expect(microsToUsd(700_000)).toBe(0.7)
    expect(estimateCostMicros('muse-spark-1.3-contributor', 'muse', 1_000_000, 0)).toBe(100_000)
  })

  it('reads OpenAI-style and Responses-style token fields', () => {
    expect(extractTokenUsage({ usage: { prompt_tokens: 10, completion_tokens: 4 } })).toEqual({ promptTokens: 10, completionTokens: 4 })
    expect(extractTokenUsage({ usage: { input_tokens: 3, output_tokens: 2 } })).toEqual({ promptTokens: 3, completionTokens: 2 })
    expect(extractTokenUsage({ usage: { prompt_tokens: -1 } })).toEqual({ promptTokens: 0, completionTokens: 0 })
  })

  it('keeps only training presets when dismissing warnings', () => {
    expect(sanitizeDismissedTrainingModes(['saver', 'private', 'nope', 'saver'])).toEqual(['saver'])
  })
})
