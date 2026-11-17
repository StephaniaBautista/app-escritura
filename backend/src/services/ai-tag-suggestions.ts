import { prisma } from '../lib/prisma.js'
import { ragService } from '../lib/rag-service.js'
import { manuscriptSpread } from '../lib/rag-context.js'
import { type AiProvider } from '../lib/ai-client.js'
import { presetOrDefault } from '../lib/ai-presets.js'
import { AI_ADVISER_INSTRUCTIONS } from './ai-guard.js'
import { authorizeAi, withAiQuota } from './ai-access.js'
import { generateValidated } from './ai-generation.js'
import { evidenceMessages } from './ai-evidence.js'
import { AiServiceError, type AiLocale, type AiSource } from './ai-types.js'
import { parseTagSuggestions } from './ai-wizard-parse.js'
import { assertManuscriptEligible, projectStoryMeta } from './ai-wizard-eligibility.js'
import { projectWordCount, type AiWizardInput } from './ai-wizard.js'
import { mergeUniqueTags, tagStyleGuidance } from './ai-tag-style.js'

export interface AiTagSuggestionsResult {
  tags: string[]
  sources: AiSource[]
  provider: AiProvider | ''
  model: string
}

function providerOrDefault(provider?: AiProvider): AiProvider {
  return presetOrDefault(provider)
}

function existingTags(meta: { tags?: string[] }): string[] {
  return Array.isArray(meta.tags)
    ? meta.tags.filter((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim()))
    : []
}

function withoutHeld(held: string[], incoming: string[]): string[] {
  const skip = new Set(held.map((tag) => tag.toLowerCase()))
  return incoming.filter((tag) => !skip.has(tag.toLowerCase()))
}

export async function suggestTags(projectId: string, userId: string, input: AiWizardInput): Promise<AiTagSuggestionsResult> {
  await authorizeAi(projectId, userId, 'ai_suggestions')
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true, storyMeta: true },
  })
  if (!project) throw new AiServiceError('NOT_FOUND', 404)
  const held = existingTags(projectStoryMeta(project.storyMeta))
  const words = await projectWordCount(projectId, userId)
  assertManuscriptEligible(words, 1)
  const locale: AiLocale = input.locale ?? 'es'
  return withAiQuota(userId, async (budget) => {
    const context = await ragService.build({
      projectId, userId, query: 'Story tropes, tone, warnings and relationship dynamics in the manuscript',
      ...manuscriptSpread(words),
    })
    if (!context) throw new AiServiceError('NOT_FOUND', 404)
    const sources = context.sources.filter((source) => source.type === 'document')
    if (sources.length === 0) throw new AiServiceError('AI_WIZARD_EMPTY', 422)
    const packed = evidenceMessages(
      `${AI_ADVISER_INSTRUCTIONS}\nReturn only JSON {"tags":[...]} with at most 8 strings of at most 80 characters.\nDo not write manuscript prose.\n${tagStyleGuidance(locale)}`,
      `Existing tags (do not repeat): ${JSON.stringify(held)}`,
      sources,
    )
    if (packed.sources.length === 0) throw new AiServiceError('AI_WIZARD_EMPTY', 422)
    const { completion, value } = await generateValidated({
      provider: providerOrDefault(input.provider), userId, json: true, maxTokens: 800,
      messages: packed.messages,
    }, budget, parseTagSuggestions)
    await authorizeAi(projectId, userId, 'ai_suggestions')
    if (budget.signal.aborted) throw new AiServiceError('AI_TIMEOUT', 504)
    return {
      tags: withoutHeld(held, mergeUniqueTags([], value)),
      sources: packed.sources,
      provider: completion.provider,
      model: '',
    }
  })
}
