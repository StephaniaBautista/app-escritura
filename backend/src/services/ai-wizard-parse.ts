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

function text(value: unknown, max: number): string {
  if (typeof value !== 'string') return invalid('expected_string')
  if (!value.trim()) return invalid('empty_string')
  if (value.length > max) return invalid('text_too_long')
  return value.trim()
}

function stringList(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,;/|]/)
      : invalid('expected_array')
  const items = raw.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
  if (items.length > 8) return invalid('array_too_long')
  return items.map((item) => text(item, 80))
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

function parseCharacter(value: unknown): WizardCharacterFill {
  const row = record(value)
  if (Object.keys(row).some((key) => !['name', 'isOC', 'initialState', 'initialPhysicalState'].includes(key))) {
    return invalid('unexpected_fields')
  }
  const character: WizardCharacterFill = { name: text(row.name, 80), isOC: row.isOC === true }
  if (row.initialState !== undefined) character.initialState = text(row.initialState, 500)
  if (row.initialPhysicalState !== undefined) character.initialPhysicalState = text(row.initialPhysicalState, 500)
  return character
}

function parseAnswers(value: unknown): Record<string, string> {
  const row = record(value)
  const answers: Record<string, string> = {}
  for (const key of Object.keys(row)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return invalid('unexpected_fields')
    if (!isWizardStructurePromptId(key)) continue
    answers[key] = text(row[key], 1600)
  }
  return answers
}

function parseScenes(value: unknown): WizardSceneFill[] {
  if (!Array.isArray(value)) return invalid('expected_array')
  if (value.length > 6) return invalid('array_too_long')
  return value.map((item) => {
    const row = record(item)
    if (Object.keys(row).some((key) => !['title', 'form'].includes(key))) return invalid('unexpected_fields')
    const form = text(row.form, 20)
    if (form !== 'chapter' && form !== 'note') return invalid('unsupported_field')
    return { title: text(row.title, 80), form }
  })
}

function parseSection(value: unknown): WizardSectionFill {
  const row = record(value)
  if (Object.keys(row).some((key) => !['id', 'title', 'content', 'answers', 'scenes'].includes(key))) {
    return invalid('unexpected_fields')
  }
  const section: WizardSectionFill = { id: text(row.id, 80) }
  if (row.title !== undefined) section.title = text(row.title, 80)
  if (row.content !== undefined) section.content = text(row.content, 1600)
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
    if (key === 'description') fill.description = text(item, 2000)
    else if (key === 'rating') {
      const rating = text(item, 20)
      if (!RATINGS.has(rating)) return invalid('unsupported_field')
      fill.rating = rating as WizardFill['rating']
    } else if (key === 'isFanfic') {
      if (typeof item !== 'boolean') return invalid('shape')
      fill.isFanfic = item
    } else if (key === 'type' || key === 'fandoms' || key === 'categories' || key === 'ships' || key === 'tags') {
      fill[key] = stringList(item)
    } else if (key === 'characters') {
      if (!Array.isArray(item)) return invalid('expected_array')
      if (item.length > 12) return invalid('array_too_long')
      fill.characters = item.map(parseCharacter)
    } else if (key === 'structure') {
      const structure = record(item)
      if (Object.keys(structure).some((field) => field !== 'sections')) return invalid('unexpected_fields')
      if (!Array.isArray(structure.sections)) return invalid('expected_array')
      if (structure.sections.length > 8) return invalid('array_too_long')
      fill.structure = { sections: structure.sections.map(parseSection) }
    } else if (
      key === 'narrator' || key === 'ending' || key === 'worldContext' || key === 'initialSituation'
      || key === 'centralTheme' || key === 'problems' || key === 'protagonistLife' || key === 'protagonistEvolution'
    ) {
      fill[key] = text(item, 1600)
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
  const items = Array.isArray(value) ? value : [value]
  if (items.length > 8) return invalid('array_too_long')
  const allowed = new Set<string>(fields)
  const suggestions: WizardStageSuggestion[] = []
  for (const item of items) {
    const row = objectRecord(item)
    if (!row.field) continue
    const field = text(row.field, 40)
    if (!allowed.has(field) || field === '__proto__' || field === 'constructor' || field === 'prototype') continue
    const parsed = parseWizardFill(JSON.stringify({ [field]: row.value }), [field as WizardGap])
    const extracted = field === 'description' ? parsed.description : wizardMetaPatch(parsed)[field]
    if (extracted === undefined) continue
    suggestions.push({
      field: field as WizardGap,
      title: typeof row.title === 'string' && row.title.trim() ? text(row.title, 120) : field,
      description: typeof row.description === 'string' && row.description.trim() ? text(row.description, 500) : field,
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
