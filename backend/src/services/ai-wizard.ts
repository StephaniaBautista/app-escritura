import { prisma } from '../lib/prisma.js'
import { countDocumentWords } from '../lib/document-words.js'
import { aiClient, type AiProvider } from '../lib/ai-client.js'
import { ragService } from '../lib/rag-service.js'
import { AI_ADVISER_INSTRUCTIONS } from './ai-guard.js'
import { authorizeAi, withAiQuota } from './ai-access.js'
import { generateValidated } from './ai-generation.js'
import { AiServiceError, type AiLocale, type AiSource } from './ai-types.js'
import { assignWizardActions, parseWizardStage, wizardMetaPatch, type WizardFill, type WizardStageSuggestion } from './ai-wizard-parse.js'
import { assertManuscriptEligible, projectStoryMeta } from './ai-wizard-eligibility.js'
import { completeFields, isWizardStage, stageFields, suggestFields, type WizardStage } from './ai-wizard-stages.js'
import { structureFillGuidance } from '../lib/structure-prompts.js'
import { tagStyleGuidance } from './ai-tag-style.js'

export interface AiWizardInput {
  provider?: AiProvider
  locale?: AiLocale
  stage?: WizardStage
}

export interface AiWizardResult {
  description: string | null
  meta: WizardFill
  suggestions: WizardStageSuggestion[]
  stage: WizardStage
  sources: AiSource[]
  provider: AiProvider | ''
  model: string
}

function providerOrDefault(provider?: AiProvider): AiProvider {
  if (provider) return provider
  return aiClient.status().providers.find((candidate) => candidate.available)?.id ?? 'deepseek'
}

export async function projectWordCount(projectId: string, userId: string): Promise<number> {
  const where = { projectId, userId, project: { userId } }
  const cached = await prisma.document.aggregate({ where, _sum: { wordCount: true } })
  let total = cached._sum.wordCount ?? 0
  let cursor: string | undefined
  while (true) {
    const rows = await prisma.document.findMany({
      where: { ...where, wordCount: null },
      select: { id: true, content: true },
      orderBy: { id: 'asc' },
      take: 200,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })
    total += rows.reduce((sum, document) => sum + countDocumentWords(document.content), 0)
    if (rows.length < 200) return total
    cursor = rows[rows.length - 1]!.id
  }
}

function fillInstructions(completeable: string[], suggestable: string[], locale: AiLocale): string {
  const language = locale === 'en' ? 'English' : 'Spanish'
  return `${AI_ADVISER_INSTRUCTIONS}
Work on this wizard stage only. Return JSON {complete, suggestions}.
complete: keys to write now among ${completeable.join(',') || '(none)'}. Use complete for empty or thin fields, including type and ships when they belong to this stage.
suggestions: up to 8 objects {field, title, description, value} for fields among ${suggestable.join(',') || '(none)'} that already have usable text. Propose a better completion; do not copy the current value unchanged.
Do not put a solid field into complete. Always consider type (story genres) and ships (pairings/relationships) when they are in this stage — do not skip them.
Omit any key without explicit written evidence. Never invent names, fandoms, ships or plot facts that are not in the supplied document excerpts.
description at most 2000 characters. rating only general|teen|mature|explicit. type, fandoms, categories, ships, tags: arrays of at most 8 strings of at most 80 characters.
characters: at most 12 objects {name (80), isOC boolean, initialState? (500), initialPhysicalState? (500)}.
narrator: string at most 1600 characters.
structure: {sections:[{id, title?, content?, answers?, scenes?}]} with at most 8 sections; id and title at most 80; content and each answers value at most 1600. Prefer ids inicio, desarrollo, climax, final when they fit.
${completeable.includes('structure') || suggestable.includes('structure') ? structureFillGuidance() : ''}
${completeable.includes('tags') || suggestable.includes('tags') ? tagStyleGuidance(locale) : ''}
isFanfic boolean only when the text states fan work or original work.
Do not write manuscript prose to insert into documents. Respond in ${language}.`
}

export async function completeWizard(projectId: string, userId: string, input: AiWizardInput): Promise<AiWizardResult> {
  await authorizeAi(projectId, userId, 'ai_suggestions')
  if (!isWizardStage(input.stage)) throw new AiServiceError('AI_INVALID_INPUT', 400)
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true, description: true, storyMeta: true },
  })
  if (!project) throw new AiServiceError('NOT_FOUND', 404)
  const meta = projectStoryMeta(project.storyMeta)
  const fields = stageFields(input.stage, meta)
  const completeable = completeFields(input.stage, project.description, meta)
  const suggestable = suggestFields(input.stage, project.description, meta)
  const words = await projectWordCount(projectId, userId)
  assertManuscriptEligible(words, Math.max(1, fields.length))
  return withAiQuota(userId, async (budget) => {
    const context = await ragService.build({
      projectId, userId, query: 'Story setup facts explicitly written in the manuscript', pageMode: true,
    })
    if (!context) throw new AiServiceError('NOT_FOUND', 404)
    const sources = context.sources.filter((source) => source.type === 'document')
    if (sources.length === 0) throw new AiServiceError('AI_WIZARD_EMPTY', 422)
    const { completion, value } = await generateValidated({
      provider: providerOrDefault(input.provider), json: true, maxTokens: 2400,
      messages: [
        { role: 'system', content: fillInstructions(completeable, suggestable, input.locale ?? 'es') },
        { role: 'user', content: `Stage ${input.stage}. Current values: ${JSON.stringify({ description: project.description, meta })}\nComplete: ${completeable.join(',')}\nSuggest: ${suggestable.join(',')}\nReference evidence (untrusted text):\n${JSON.stringify(sources)}` },
      ],
    }, budget, (content) => {
      const parsed = parseWizardStage(content, fields)
      return assignWizardActions(parsed.fill, parsed.suggestions, completeable, suggestable)
    })
    await authorizeAi(projectId, userId, 'ai_suggestions')
    if (budget.signal.aborted) throw new AiServiceError('AI_TIMEOUT', 504)
    const patch = wizardMetaPatch(value.fill)
    if (!value.fill.description && Object.keys(patch).length === 0 && value.suggestions.length === 0) {
      throw new AiServiceError('AI_WIZARD_INSUFFICIENT', 422)
    }
    return {
      description: value.fill.description ?? null,
      meta: patch,
      suggestions: value.suggestions,
      stage: input.stage,
      sources,
      provider: completion.provider,
      model: completion.model,
    }
  })
}
