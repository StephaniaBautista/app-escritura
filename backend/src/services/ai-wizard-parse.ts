import { isWizardStructurePromptId } from '../lib/structure-prompts.js'
import { AiServiceError, type AiValidationIssue } from './ai-types.js'
import type { WizardGap } from './ai-wizard-eligibility.js'

export interface WizardCharacterFill {
  name: string
  isOC: boolean
  initialState?: string
  initialPhysicalState?: string
}

export interface WizardSceneFill {
  title: string
  form: 'chapter' | 'note'
}

export interface WizardSectionFill {
  id: string
  title?: string
  content?: string
  answers?: Record<string, string>
  scenes?: WizardSceneFill[]
}

export interface WizardFill {
  description?: string
  rating?: 'general' | 'teen' | 'mature' | 'explicit'
  type?: string[]
  isFanfic?: boolean
  fandoms?: string[]
  categories?: string[]
  ships?: string[]
  characters?: WizardCharacterFill[]
  tags?: string[]
  narrator?: string
  ending?: string
  worldContext?: string
  initialSituation?: string
  centralTheme?: string
  problems?: string
  protagonistLife?: string
  protagonistEvolution?: string
  structure?: { sections: WizardSectionFill[] }
}

const RATINGS = new Set(['general', 'teen', 'mature', 'explicit'])

function invalid(issue: AiValidationIssue = 'shape'): never {
  throw new AiServiceError('AI_INVALID_RESPONSE', 502, issue)
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid('expected_object')
  return value as Record<string, unknown>
}

function clipText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

function stringList(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,;/|]/)
      : invalid('expected_array')
  const items = raw
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    .map((item) => item.trim().slice(0, 80))
    .filter(Boolean)
  return items.slice(0, 8)
}

function objectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function coerceComplete(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (Array.isArray(value)) {
    const merged: Record<string, unknown> = {}
    for (const item of value) {
      const row = objectRecord(item)
      const field = row.field
      if (typeof field === 'string' && field !== '__proto__' && field !== 'constructor' && field !== 'prototype' && row.value !== undefined) {
        merged[field] = row.value
      } else {
        for (const [key, entry] of Object.entries(row)) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
          merged[key] = entry
        }
      }
    }
    return merged
  }
  return objectRecord(value)
}

export function parseTagSuggestions(content: string): string[] {
  let value: unknown
  try { value = JSON.parse(content) } catch { return invalid('invalid_json') }
  const output = record(value)
  if (!('tags' in output)) return invalid('shape')
  return stringList(output.tags)
}

function parseCharacter(value: unknown): WizardCharacterFill | null {
  const row = record(value)
  if (Object.keys(row).some((key) => !['name', 'isOC', 'initialState', 'initialPhysicalState'].includes(key))) {
    return null
  }
  const name = clipText(row.name, 80)
  if (!name) return null
  const character: WizardCharacterFill = { name, isOC: row.isOC === true }
  const initialState = clipText(row.initialState, 500)
  if (initialState) character.initialState = initialState
  const initialPhysicalState = clipText(row.initialPhysicalState, 500)
  if (initialPhysicalState) character.initialPhysicalState = initialPhysicalState
  return character
}

function parseAnswers(value: unknown): Record<string, string> {
  const row = record(value)
  const answers: Record<string, string> = {}
  for (const key of Object.keys(row)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return invalid('unexpected_fields')
    if (!isWizardStructurePromptId(key)) continue
    const answer = clipText(row[key], 1600)
    if (answer) answers[key] = answer
  }
  return answers
}

function parseScenes(value: unknown): WizardSceneFill[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 6).flatMap((item) => {
    const row = record(item)
    if (Object.keys(row).some((key) => !['title', 'form'].includes(key))) return []
    const form = clipText(row.form, 20)
    if (form !== 'chapter' && form !== 'note') return []
    const title = clipText(row.title, 80)
    if (!title) return []
    return [{ title, form }]
  })
}

function parseSection(value: unknown): WizardSectionFill | null {
  const row = record(value)
  if (Object.keys(row).some((key) => !['id', 'title', 'content', 'answers', 'scenes'].includes(key))) {
    return null
  }
  const id = clipText(row.id, 80)
  if (!id) return null
  const section: WizardSectionFill = { id }
  const title = clipText(row.title, 80)
  if (title) section.title = title
  const content = clipText(row.content, 1600)
  if (content) section.content = content
  if (row.answers !== undefined) {
    const answers = parseAnswers(row.answers)
    if (Object.keys(answers).length > 0) section.answers = answers
  }
  if (row.scenes !== undefined) {
    const scenes = parseScenes(row.scenes)
    if (scenes.length > 0) section.scenes = scenes
  }
  return section
}

export function parseWizardFill(content: string, gaps: WizardGap[]): WizardFill {
  let value: unknown
  try { value = JSON.parse(content) } catch { return invalid('invalid_json') }
  const output = record(value)
  const fill: WizardFill = {}
  const allowed = new Set<string>(gaps)
  for (const key of Object.keys(output)) {
    if (!allowed.has(key)) continue
    const item = output[key]
    if (key === 'description') {
      const description = clipText(item, 2000)
      if (description) fill.description = description
    } else if (key === 'rating') {
      const rating = clipText(item, 20)
      if (rating && RATINGS.has(rating)) fill.rating = rating as WizardFill['rating']
    } else if (key === 'isFanfic') {
      if (typeof item === 'boolean') fill.isFanfic = item
    } else if (key === 'type' || key === 'fandoms' || key === 'categories' || key === 'ships' || key === 'tags') {
      const list = stringList(item)
      if (list.length > 0) fill[key] = list
    } else if (key === 'characters') {
      if (!Array.isArray(item)) continue
      const characters = item.slice(0, 12).map(parseCharacter).filter((character): character is WizardCharacterFill => character !== null)
      if (characters.length > 0) fill.characters = characters
    } else if (key === 'structure') {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const structure = item as Record<string, unknown>
      if (Object.keys(structure).some((field) => field !== 'sections')) continue
      if (!Array.isArray(structure.sections)) continue
      const sections = structure.sections.slice(0, 8).map(parseSection).filter((section): section is WizardSectionFill => section !== null)
      if (sections.length > 0) fill.structure = { sections }
    } else if (
      key === 'narrator' || key === 'ending' || key === 'worldContext' || key === 'initialSituation'
      || key === 'centralTheme' || key === 'problems' || key === 'protagonistLife' || key === 'protagonistEvolution'
    ) {
      const field = clipText(item, 1600)
      if (field) fill[key] = field
    }
  }
  return fill
}

function scenesToAnswer(scenes: WizardSceneFill[]): string {
  return scenes
    .map((scene) => `${scene.form === 'note' ? 'nota' : 'capítulo'}: ${scene.title}`)
    .join('\n')
}

export interface WizardStageSuggestion {
  field: WizardGap
  title: string
  description: string
  value: unknown
}

export interface WizardStageParsed {
  fill: WizardFill
  suggestions: WizardStageSuggestion[]
}

function parseStageSuggestions(value: unknown, fields: WizardGap[]): WizardStageSuggestion[] {
  if (value === undefined || value === null) return []
  const items = (Array.isArray(value) ? value : [value]).slice(0, 8)
  const allowed = new Set<string>(fields)
  const suggestions: WizardStageSuggestion[] = []
  for (const item of items) {
    const row = objectRecord(item)
    if (!row.field) continue
    const field = clipText(row.field, 40)
    if (!field || !allowed.has(field) || field === '__proto__' || field === 'constructor' || field === 'prototype') continue
    let extracted: unknown
    try {
      const parsed = parseWizardFill(JSON.stringify({ [field]: row.value }), [field as WizardGap])
      extracted = field === 'description' ? parsed.description : wizardMetaPatch(parsed)[field]
    } catch {
      continue
    }
    if (extracted === undefined) continue
    suggestions.push({
      field: field as WizardGap,
      title: clipText(row.title, 120) || field,
      description: clipText(row.description, 500) || field,
      value: extracted,
    })
  }
  return suggestions
}

export function parseWizardStage(content: string, fields: WizardGap[]): WizardStageParsed {
  let value: unknown
  try { value = JSON.parse(content) } catch { return invalid('invalid_json') }
  const output = record(value)
  const completeRaw = 'complete' in output
    ? coerceComplete(output.complete)
    : Object.fromEntries(Object.entries(output).filter(([key]) => key !== 'suggestions'))
  const fill = parseWizardFill(JSON.stringify(completeRaw), fields)
  return { fill, suggestions: parseStageSuggestions(output.suggestions, fields) }
}

function writeFill(target: WizardFill, field: WizardGap, value: unknown): void {
  if (field === 'description' && typeof value === 'string') target.description = value
  else if (value !== undefined) (target as Record<string, unknown>)[field] = value
}

function readFill(fill: WizardFill, field: WizardGap): unknown {
  return field === 'description' ? fill.description : (fill as Record<string, unknown>)[field]
}

export function assignWizardActions(
  fill: WizardFill,
  suggestions: WizardStageSuggestion[],
  completeable: WizardGap[],
  suggestable: WizardGap[],
): WizardStageParsed {
  const suggestSet = new Set(suggestable)
  const nextFill: WizardFill = {}
  const nextSuggestions = suggestions.filter((item) => suggestSet.has(item.field))
  for (const field of completeable) {
    const value = readFill(fill, field) ?? suggestions.find((item) => item.field === field)?.value
    if (value !== undefined) writeFill(nextFill, field, value)
  }
  for (const field of suggestable) {
    const value = readFill(fill, field)
    if (value === undefined || nextSuggestions.some((item) => item.field === field)) continue
    nextSuggestions.push({ field, title: field, description: '', value })
  }
  return { fill: nextFill, suggestions: nextSuggestions }
}

export function wizardMetaPatch(fill: WizardFill): Record<string, unknown> {
  const { description: _description, ...meta } = fill
  const sections = meta.structure?.sections
  if (!sections) return meta
  meta.structure = {
    sections: sections.map((section) => {
      if (!section.scenes?.length) return section
      const answers = { ...(section.answers ?? {}) }
      if (!answers['wizard:desarrollo:scenes']?.trim()) {
        answers['wizard:desarrollo:scenes'] = scenesToAnswer(section.scenes)
      }
      return { ...section, answers }
    }),
  }
  return meta
}
