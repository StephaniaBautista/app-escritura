import { CHARACTER_COMPLETION_FIELDS } from './ai-output.js'
import { AiServiceError, type AiValidationIssue } from './ai-types.js'
import type { CharacterFillField } from './ai-character-eligibility.js'
import { normalizeOrientation } from './ai-character-orientation.js'

export interface CharacterFill {
  name: string
  description?: string
  nicknames?: string[]
  age?: string
  gender?: string
  orientation?: string
  species?: string
  birthPlace?: string
  role?: string
  roleSpec?: string
  isOC?: boolean
  attributes?: Record<string, string>
}

const ALLOWED = new Set([
  'name', 'description', 'nicknames', 'age', 'gender', 'orientation', 'species', 'birthPlace', 'role', 'roleSpec', 'isOC', 'attributes',
])
const ATTRIBUTE_KEYS = CHARACTER_COMPLETION_FIELDS
  .filter((field) => field.startsWith('attributes.'))
  .map((field) => field.slice('attributes.'.length))

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

function nicknames(value: unknown): string[] {
  if (!Array.isArray(value)) return invalid('expected_array')
  if (value.length > 8) return invalid('array_too_long')
  return value.map((item) => text(item, 80))
}

function fieldMax(field: string): number {
  if (field === 'age' || field === 'gender' || field === 'role' || field === 'orientation') return 100
  if (field === 'species' || field === 'birthPlace' || field === 'roleSpec') return 200
  return 1600
}

function parseAttributes(value: unknown, allowed: Set<string>): Record<string, string> | undefined {
  const row = record(value)
  const attributes: Record<string, string> = {}
  for (const key of Object.keys(row)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return invalid('unexpected_fields')
    if (!ATTRIBUTE_KEYS.includes(key) || !allowed.has(`attributes.${key}`)) continue
    attributes[key] = text(row[key], fieldMax(`attributes.${key}`))
  }
  return Object.keys(attributes).length ? attributes : undefined
}

function parseCharacter(value: unknown, gaps: CharacterFillField[], catalog: string[]): CharacterFill {
  const row = record(value)
  if (Object.keys(row).some((key) => !ALLOWED.has(key))) return invalid('unexpected_fields')
  const allowed = new Set(gaps)
  const fill: CharacterFill = { name: text(row.name, 80) }
  const assign = (key: Exclude<keyof CharacterFill, 'name' | 'nicknames' | 'isOC' | 'attributes'>, max: number) => {
    if (row[key] === undefined || !allowed.has(key)) return
    fill[key] = text(row[key], max)
  }
  assign('description', 1600)
  assign('age', fieldMax('age'))
  assign('gender', fieldMax('gender'))
  assign('species', fieldMax('species'))
  assign('birthPlace', fieldMax('birthPlace'))
  assign('role', fieldMax('role'))
  assign('roleSpec', fieldMax('roleSpec'))
  if (row.orientation !== undefined && allowed.has('orientation')) {
    const orientation = normalizeOrientation(text(row.orientation, 100), catalog)
    if (orientation) fill.orientation = orientation
  }
  if (row.nicknames !== undefined && allowed.has('name')) fill.nicknames = nicknames(row.nicknames)
  if (row.isOC === true && allowed.has('name')) fill.isOC = true
  if (row.attributes !== undefined) {
    const attributes = parseAttributes(row.attributes, allowed)
    if (attributes) fill.attributes = attributes
  }
  return fill
}

export function parseCharacterFill(content: string, gaps: CharacterFillField[], catalog?: string[]): CharacterFill[] {
  let value: unknown
  try { value = JSON.parse(content) } catch { return invalid('invalid_json') }
  const output = record(value)
  if (!('characters' in output)) return invalid('shape')
  if (!Array.isArray(output.characters)) return invalid('expected_array')
  if (output.characters.length > 8) return invalid('array_too_long')
  return output.characters.map((item) => parseCharacter(item, gaps, catalog ?? []))
}

export function characterHasEvidence(fill: CharacterFill, gaps: CharacterFillField[]): boolean {
  if (gaps.includes('name') && fill.name.trim()) return true
  if (fill.description || fill.age || fill.gender || fill.orientation || fill.species || fill.birthPlace || fill.role || fill.roleSpec) return true
  if (fill.nicknames?.length || fill.isOC === true) return true
  return Boolean(fill.attributes && Object.keys(fill.attributes).length > 0)
}
