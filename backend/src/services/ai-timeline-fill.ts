import { prisma } from '../lib/prisma.js'
import { ragService } from '../lib/rag-service.js'
import { manuscriptSpread } from '../lib/rag-context.js'
import { AI_MAX_OUTPUT_TOKENS, type AiProvider } from '../lib/ai-client.js'
import { presetOrDefault } from '../lib/ai-presets.js'
import { AI_ADVISER_INSTRUCTIONS } from './ai-guard.js'
import { authorizeAi, withAiQuota } from './ai-access.js'
import { generateValidated } from './ai-generation.js'
import { evidenceMessages } from './ai-evidence.js'
import { AiServiceError, type AiLocale, type AiSource } from './ai-types.js'
import { assertManuscriptEligible } from './ai-wizard-eligibility.js'
import { projectWordCount, type AiWizardInput } from './ai-wizard.js'
import { timelineGapCount } from './ai-timeline-eligibility.js'
import {
  TIMELINE_MAX_ERAS,
  TIMELINE_MAX_EVENTS,
  eraHasEvidence,
  eventHasEvidence,
  parseTimelineFill,
  type TimelineEraFill,
  type TimelineEventFill,
  type TimelineFill,
} from './ai-timeline-parse.js'

export type AiTimelineFillInput = AiWizardInput

export interface AiTimelineFillResult extends TimelineFill {
  sources: AiSource[]
  provider: AiProvider | ''
  model: string
}

function providerOrDefault(provider?: AiProvider): AiProvider {
  return presetOrDefault(provider)
}

function sameKey(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase()
}

function fillInstructions(locale: AiLocale): string {
  const language = locale === 'en' ? 'English' : 'Spanish'
  return `${AI_ADVISER_INSTRUCTIONS}
Return only JSON {"eras":[...],"events":[...]}.
Extract every distinct era and event explicitly supported by the manuscript. Do not stop at 1–3 items. Include all that the text implies, up to ${TIMELINE_MAX_ERAS} eras and ${TIMELINE_MAX_EVENTS} events.
Omit any key without written evidence. Never invent names, dates or facts that are not in the supplied document excerpts.
eras objects may include only: name (required, max 80), startDate, endDate (max 80; prefer Y, Y-M or Y-M-D), precision (year|month|week|day|hour|minute), rollover (newYear|afterYear), order (integer 0–9999).
events objects may include only: title (required, max 80), description (max 1600), date, endDate (max 80), eraName (must match an era name in eras or Held eras), characterNames (array of at most 40 names of at most 80, only names that appear in Held characters), precision (year|month|day|minute), order (integer 0–9999).
For Held eras and events, fill only fields that are still empty. Do not change names or overwrite existing text.
Do not write manuscript prose. Respond in ${language}.`
}

function uniqueBy<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = keyOf(item).trim().toLocaleLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function knownName(value: string | undefined, names: string[]): string | undefined {
  if (!value) return undefined
  const match = names.find((name) => sameKey(name, value))
  return match
}

function patchEra(
  fill: TimelineEraFill,
  existing: { name: string; startDate: string | null; endDate: string | null },
): TimelineEraFill | null {
  const next: TimelineEraFill = { name: existing.name }
  if (!existing.startDate?.trim() && fill.startDate) next.startDate = fill.startDate
  if (!existing.endDate?.trim() && fill.endDate) next.endDate = fill.endDate
  if (next.startDate || next.endDate) return next
  return null
}

function patchEvent(
  fill: TimelineEventFill,
  existing: { title: string; description: string | null; date: string | null; endDate: string | null; eraId: string | null; characterIds: string[] },
  eraNames: string[],
  characterNames: string[],
): TimelineEventFill | null {
  const next: TimelineEventFill = { title: existing.title }
  if (!existing.description?.trim() && fill.description) next.description = fill.description
  if (!existing.date?.trim() && fill.date) next.date = fill.date
  if (!existing.endDate?.trim() && fill.endDate) next.endDate = fill.endDate
  if (!existing.eraId && fill.eraName) {
    const eraName = knownName(fill.eraName, eraNames)
    if (eraName) next.eraName = eraName
  }
  if ((!existing.characterIds || existing.characterIds.length === 0) && fill.characterNames?.length) {
    const names = fill.characterNames.map((name) => knownName(name, characterNames)).filter((name): name is string => Boolean(name))
    if (names.length) next.characterNames = names
  }
  if (next.description || next.date || next.endDate || next.eraName || next.characterNames?.length) return next
  return null
}

function keepEras(
  fills: TimelineEraFill[],
  existing: { name: string; startDate: string | null; endDate: string | null }[],
): TimelineEraFill[] {
  return uniqueBy(fills, (fill) => fill.name).flatMap((fill) => {
    if (!eraHasEvidence(fill)) return []
    const match = existing.find((era) => sameKey(era.name, fill.name))
    if (!match) return [fill]
    const patched = patchEra(fill, match)
    return patched ? [patched] : []
  })
}

function keepEvents(
  fills: TimelineEventFill[],
  existing: { title: string; description: string | null; date: string | null; endDate: string | null; eraId: string | null; characterIds: string[] }[],
  eraNames: string[],
  characterNames: string[],
): TimelineEventFill[] {
  return uniqueBy(fills, (fill) => fill.title).flatMap((fill) => {
    if (!eventHasEvidence(fill)) return []
    const eraName = knownName(fill.eraName, eraNames)
    const names = (fill.characterNames ?? []).map((name) => knownName(name, characterNames)).filter((name): name is string => Boolean(name))
    const normalized: TimelineEventFill = { ...fill }
    if (eraName) normalized.eraName = eraName
    else delete normalized.eraName
    if (names.length) normalized.characterNames = names
    else delete normalized.characterNames
    const match = existing.find((event) => sameKey(event.title, fill.title))
    if (!match) return [normalized]
    const patched = patchEvent(normalized, match, eraNames, characterNames)
    return patched ? [patched] : []
  })
}

export async function fillTimeline(
  projectId: string,
  userId: string,
  input: AiTimelineFillInput,
): Promise<AiTimelineFillResult> {
  await authorizeAi(projectId, userId, 'ai_suggestions')
  const owned = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } })
  if (!owned) throw new AiServiceError('NOT_FOUND', 404)
  const [eras, events, characters] = await Promise.all([
    prisma.timelineEra.findMany({
      where: { projectId, project: { userId } },
      select: { name: true, startDate: true, endDate: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.timelineEvent.findMany({
      where: { projectId, project: { userId } },
      select: { title: true, description: true, date: true, endDate: true, eraId: true, characterIds: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.character.findMany({
      where: { projectId, project: { userId } },
      select: { name: true },
    }),
  ])
  const words = await projectWordCount(projectId, userId)
  assertManuscriptEligible(words, timelineGapCount(eras, events))
  const characterNames = characters.map((row) => row.name)
  return withAiQuota(userId, async (budget) => {
    const context = await ragService.build({
      projectId, userId, query: 'Timeline eras, historical periods, dated events and turning points explicitly written in the manuscript',
      ...manuscriptSpread(words),
    })
    if (!context) throw new AiServiceError('NOT_FOUND', 404)
    const sources = context.sources.filter((source) => source.type === 'document')
    if (sources.length === 0) throw new AiServiceError('AI_WIZARD_EMPTY', 422)
    const packed = evidenceMessages(
      fillInstructions(input.locale ?? 'es'),
      `Held eras: ${JSON.stringify(eras.map((era) => era.name))}\nHeld events: ${JSON.stringify(events.map((event) => event.title))}\nHeld characters: ${JSON.stringify(characterNames)}`,
      sources,
    )
    if (packed.sources.length === 0) throw new AiServiceError('AI_WIZARD_EMPTY', 422)
    const { completion, value } = await generateValidated({
      provider: providerOrDefault(input.provider), userId, json: true, maxTokens: AI_MAX_OUTPUT_TOKENS,
      messages: packed.messages,
    }, budget, parseTimelineFill)
    await authorizeAi(projectId, userId, 'ai_suggestions')
    if (budget.signal.aborted) throw new AiServiceError('AI_TIMEOUT', 504)
    const proposedEras = keepEras(value.eras, eras)
    const eraNames = [...eras.map((era) => era.name), ...proposedEras.map((era) => era.name)]
    const proposedEvents = keepEvents(value.events, events, eraNames, characterNames)
    if (proposedEras.length === 0 && proposedEvents.length === 0) throw new AiServiceError('AI_WIZARD_INSUFFICIENT', 422)
    return { eras: proposedEras, events: proposedEvents, sources: packed.sources, provider: completion.provider, model: '' }
  })
}
