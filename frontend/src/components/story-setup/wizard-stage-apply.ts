import type { StoryMeta } from '@/types/story'

const LIST_FIELDS = new Set(['type', 'fandoms', 'categories', 'ships', 'tags'])

export function mergeUniqueStrings(existing: string[], incoming: string[]): string[] {
  const merged: string[] = []
  const seen = new Set<string>()
  for (const raw of [...existing, ...incoming]) {
    if (typeof raw !== 'string') continue
    const item = raw.trim()
    if (!item) continue
    const key = item.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }
  return merged
}

export function mergeAiMetaPatch(meta: StoryMeta, patch: Partial<StoryMeta>): StoryMeta {
  const next = { ...meta, ...patch }
  if (Array.isArray(patch.ships)) {
    next.ships = mergeUniqueStrings(Array.isArray(meta.ships) ? meta.ships : [], patch.ships)
  }
  return next
}

export function applyStageValue(
  description: string,
  meta: StoryMeta,
  field: string,
  value: unknown,
): { description: string; meta: StoryMeta } {
  if (field === 'description' && typeof value === 'string') {
    return { description: value, meta }
  }
  if (field === 'isFanfic' && typeof value === 'boolean') {
    return { description, meta: { ...meta, isFanfic: value } }
  }
  if (LIST_FIELDS.has(field) && Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    if (field === 'ships') {
      const existing = Array.isArray(meta.ships) ? meta.ships : []
      return { description, meta: { ...meta, ships: mergeUniqueStrings(existing, items) } }
    }
    return { description, meta: { ...meta, [field]: items } }
  }
  if (field === 'characters' && Array.isArray(value)) {
    return { description, meta: { ...meta, characters: value as StoryMeta['characters'] } }
  }
  if (field === 'structure' && value && typeof value === 'object') {
    return { description, meta: { ...meta, structure: value as StoryMeta['structure'] } }
  }
  if (typeof value === 'string') {
    return { description, meta: { ...meta, [field]: value } }
  }
  return { description, meta }
}
