import { allWizardStructurePromptsFilled } from '../lib/structure-prompts.js'
import { AiServiceError } from './ai-types.js'

export const WIZARD_GAP_FIELDS = [
  'description', 'rating', 'type', 'isFanfic', 'fandoms', 'categories', 'ships',
  'characters', 'tags', 'narrator', 'ending', 'worldContext', 'initialSituation',
  'centralTheme', 'problems', 'protagonistLife', 'protagonistEvolution', 'structure',
] as const

export type WizardGap = (typeof WIZARD_GAP_FIELDS)[number]

export interface WizardMeta {
  rating?: string
  type?: string[]
  isFanfic?: boolean
  fandoms?: string[]
  categories?: string[]
  ships?: string[]
  characters?: { name?: string; isOC?: boolean; initialState?: string; initialPhysicalState?: string }[]
  tags?: string[]
  narrator?: string
  ending?: string
  worldContext?: string
  initialSituation?: string
  centralTheme?: string
  problems?: string
  protagonistLife?: string
  protagonistEvolution?: string
  structure?: { sections?: { id?: string; content?: string; answers?: Record<string, string> }[] }
}

const WORDS_PER_GAP = 25
const MIN_WORDS = 80

function blank(value: unknown): boolean {
  return typeof value !== 'string' || !value.trim()
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : []
}

function isRomanceOrFanfic(meta: WizardMeta): boolean {
  if (meta.isFanfic) return true
  return strings(meta.type).some((type) => type.toLowerCase() === 'romance')
}

function structureFilled(meta: WizardMeta): boolean {
  return allWizardStructurePromptsFilled(meta.structure?.sections)
}

export function projectStoryMeta(value: unknown): WizardMeta {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as WizardMeta
}

export function wizardGaps(description: string | null | undefined, meta: WizardMeta): WizardGap[] {
  const gaps: WizardGap[] = []
  if (blank(description)) gaps.push('description')
  if (blank(meta.rating)) gaps.push('rating')
  if (strings(meta.type).length === 0) gaps.push('type')
  if (typeof meta.isFanfic !== 'boolean') gaps.push('isFanfic')
  if (meta.isFanfic === true && strings(meta.fandoms).length === 0) gaps.push('fandoms')
  if (meta.isFanfic === true && strings(meta.categories).length === 0) gaps.push('categories')
  if (isRomanceOrFanfic(meta) && strings(meta.ships).length === 0) gaps.push('ships')
  const characters = Array.isArray(meta.characters) ? meta.characters : []
  if (!characters.some((character) => !blank(character.name))) gaps.push('characters')
  if (strings(meta.tags).length === 0) gaps.push('tags')
  if (blank(meta.narrator)) gaps.push('narrator')
  if (blank(meta.ending)) gaps.push('ending')
  if (blank(meta.worldContext)) gaps.push('worldContext')
  if (blank(meta.initialSituation)) gaps.push('initialSituation')
  if (blank(meta.centralTheme)) gaps.push('centralTheme')
  if (blank(meta.problems)) gaps.push('problems')
  if (blank(meta.protagonistLife)) gaps.push('protagonistLife')
  if (blank(meta.protagonistEvolution)) gaps.push('protagonistEvolution')
  if (!structureFilled(meta)) gaps.push('structure')
  return gaps
}

export function isWizardIncomplete(description: string | null | undefined, meta: WizardMeta): boolean {
  return wizardGaps(description, meta).length > 0
}

export function minWordsForGaps(gapCount: number): number {
  return Math.max(MIN_WORDS, Math.min(200, gapCount * WORDS_PER_GAP))
}

export function assertManuscriptEligible(words: number, gapCount: number): void {
  if (words === 0) throw new AiServiceError('AI_WIZARD_EMPTY', 422)
  if (words < minWordsForGaps(gapCount)) throw new AiServiceError('AI_WIZARD_INSUFFICIENT', 422)
}
