import { CHARACTER_COMPLETION_FIELDS } from './ai-output.js'

export type CharacterFillField = (typeof CHARACTER_COMPLETION_FIELDS)[number] | 'name' | 'orientation'

export interface CharacterSheetSnapshot {
  name?: string | null
  description?: string | null
  age?: string | null
  gender?: string | null
  orientation?: string | null
  species?: string | null
  birthPlace?: string | null
  role?: string | null
  attributes?: unknown
}

function blank(value: unknown): boolean {
  return typeof value !== 'string' || !value.trim()
}

function attributesOf(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export function characterFillGaps(sheet: CharacterSheetSnapshot, includeName = true): CharacterFillField[] {
  const gaps: CharacterFillField[] = []
  if (includeName && blank(sheet.name)) gaps.push('name')
  if (blank(sheet.orientation)) gaps.push('orientation')
  for (const field of CHARACTER_COMPLETION_FIELDS) {
    if (field.startsWith('attributes.')) {
      if (blank(attributesOf(sheet.attributes)[field.slice('attributes.'.length)])) gaps.push(field)
      continue
    }
    if (blank(sheet[field as keyof Omit<CharacterSheetSnapshot, 'attributes'>])) gaps.push(field)
  }
  return gaps
}
