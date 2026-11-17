import { prisma } from './prisma.js'
import { estimateCostMicros } from './ai-pricing.js'
import type { AiPreset, AiVendor } from './ai-presets.js'

export async function recordAiUsage(input: {
  userId: string
  preset: AiPreset
  vendor: AiVendor
  model: string
  promptTokens: number
  completionTokens: number
}): Promise<void> {
  try {
    const costMicros = estimateCostMicros(input.model, input.vendor, input.promptTokens, input.completionTokens)
    await prisma.aiUsageEvent.create({
      data: {
        userId: input.userId,
        preset: input.preset,
        vendor: input.vendor,
        model: input.model,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        costMicros,
      },
    })
  } catch {
    return
  }
}
