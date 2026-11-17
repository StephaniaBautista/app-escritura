import { prisma } from '../lib/prisma.js'
import { countDocumentWords } from '../lib/document-words.js'
import { AI_MAX_OUTPUT_TOKENS, type AiProvider } from '../lib/ai-client.js'
import { presetOrDefault, sanitizeSelectablePreset } from '../lib/ai-presets.js'
import { ragService } from '../lib/rag-service.js'
import { AI_ADVISER_INSTRUCTIONS } from './ai-guard.js'
import { authorizeAi, withAiQuota } from './ai-access.js'
import { generateValidated } from './ai-generation.js'
import { evidenceMessages } from './ai-evidence.js'
import { AiServiceError, type AiLocale, type AiSource } from './ai-types.js'
import { assignWizardActions, parseWizardStage, wizardMetaPatch, type WizardFill, type WizardStageSuggestion } from './ai-wizard-parse.js'
import { assertManuscriptEligible, projectStoryMeta } from './ai-wizard-eligibility.js'
import { completeFields, isWizardStage, stageFields, suggestFields, type WizardStage } from './ai-wizard-stages.js'
import { manuscriptSpread } from '../lib/rag-context.js'
import { structureFillGuidance } from '../lib/structure-prompts.js'
import { tagStyleGuidance } from './ai-tag-style.js'
import { isRecord } from './settings-service.js'

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
  return presetOrDefault(provider)
}

async function resolveWizardProvider(userId: string, provider?: AiProvider): Promise<AiProvider> {
  if (provider && sanitizeSelectablePreset(provider)) return providerOrDefault(provider)
  const settings = await prisma.userSettings.findUnique({ where: { userId }, select: { uiPrefs: true } })
  const uiPrefs = settings?.uiPrefs
  const preferred = isRecord(uiPrefs) && isRecord(uiPrefs.aiToolPresets)
    ? sanitizeSelectablePreset(uiPrefs.aiToolPresets.wizard)
    : undefined
  return presetOrDefault(preferred)
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
Work on this wizard stage only.
Return ONE JSON object with exactly these two keys: "complete" and "suggestions".
"complete" MUST be an object mapping field names to values (never an array of names). Only include empty/thin fields among: ${completeable.join(',') || '(none)'}.
Example complete shape: {"description":"...","tags":["Angst"],"structure":{"sections":[{"id":"inicio","answers":{"wizard:inicio:status":"..."}}]}}
"suggestions" is an array of up to 8 objects {field, title, description, value} for solid fields among: ${suggestable.join(',') || '(none)'}. Propose a better completion; do not copy the current value unchanged.
If a field is already solid, put it only in suggestions, not in complete.
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

function evidenceQuery(stage: WizardStage, locale: AiLocale): string {
  if (locale === 'en') {
    const queries = {
      description: 'premise plot protagonist conflict setting ending',
      basics: 'genre rating mature original fanfiction fandom',
      couples: 'relationship pairing romance love kiss',
      characters: 'character name protagonist antagonist appearance',
      tags: 'tone tropes warning angst narrator',
      structure: 'beginning climax ending resolution chapter',
    }
    return queries[stage]
  }
  const queries = {
    description: 'premisa trama protagonista conflicto escenario final',
    basics: 'genero clasificacion maduro original fanfic fandom',
    couples: 'relacion pareja romance amor beso',
    characters: 'personaje nombre protagonista antagonista apariencia',
    tags: 'tono tropes advertencia angst narrador',
    structure: 'inicio climax final desenlace capitulo',
  }
  return queries[stage]
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
  const provider = await resolveWizardProvider(userId, input.provider)
  return withAiQuota(userId, async (budget) => {
    const context = await ragService.build({
      projectId, userId, query: evidenceQuery(input.stage, input.locale ?? 'es'), ...manuscriptSpread(words),
    })
    if (!context) throw new AiServiceError('NOT_FOUND', 404)
    const sources = context.sources.filter((source) => source.type === 'document')
    if (sources.length === 0) throw new AiServiceError('AI_WIZARD_EMPTY', 422)
    const packed = evidenceMessages(
      fillInstructions(completeable, suggestable, input.locale ?? 'es'),
      `Stage ${input.stage}. Current values: ${JSON.stringify({ description: project.description, meta })}\nComplete: ${completeable.join(',')}\nSuggest: ${suggestable.join(',')}`,
      sources,
    )
    if (packed.sources.length === 0) throw new AiServiceError('AI_WIZARD_EMPTY', 422)
    const { completion, value } = await generateValidated({
      provider, userId, json: true, maxTokens: AI_MAX_OUTPUT_TOKENS,
      messages: packed.messages,
    }, budget, (content) => {
      const parsed = parseWizardStage(content, fields)
      return assignWizardActions(parsed.fill, parsed.suggestions, completeable, suggestable)
    })
    await authorizeAi(projectId, userId, 'ai_suggestions')
    if (budget.signal.aborted) throw new AiServiceError('AI_TIMEOUT', 504)
    const patch = wizardMetaPatch(value.fill)
    if (!value.fill.description && Object.keys(patch).length === 0 && value.suggestions.length === 0) {
      throw new AiServiceError('AI_INVALID_RESPONSE', 502)
    }
    return {
      description: value.fill.description ?? null,
      meta: patch,
      suggestions: value.suggestions,
      stage: input.stage,
      sources: packed.sources,
      provider: completion.provider,
      model: '',
    }
  })
}
