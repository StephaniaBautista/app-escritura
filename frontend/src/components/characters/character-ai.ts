import { ATTRIBUTE_KEYS, draftToInput, emptyDraft, type CharacterDraft } from './CharacterFormFields'
import type { CharacterInput } from '@/types/character'
import type { AiCharacterFill } from '@/types/ai'

function blank(value: string | null | undefined): boolean {
  return !value || !value.trim()
}

export function applyCharacterFill(draft: CharacterDraft, fill: AiCharacterFill): CharacterDraft {
  const next: CharacterDraft = { ...draft, nicknames: [...draft.nicknames], attributes: { ...draft.attributes } }
  if (blank(next.name) && fill.name.trim()) next.name = fill.name.trim()
  if (blank(next.description) && fill.description?.trim()) next.description = fill.description.trim()
  if (next.nicknames.length === 0 && fill.nicknames?.length) next.nicknames = fill.nicknames.map((item) => item.trim()).filter(Boolean)
  if (blank(next.age) && fill.age?.trim()) next.age = fill.age.trim()
  if (blank(next.gender) && fill.gender?.trim()) next.gender = fill.gender.trim()
  if (blank(next.orientation) && fill.orientation?.trim()) next.orientation = fill.orientation.trim()
  if (blank(next.species) && fill.species?.trim()) next.species = fill.species.trim()
  if (blank(next.birthPlace) && fill.birthPlace?.trim()) next.birthPlace = fill.birthPlace.trim()
  if (blank(next.role) && fill.role?.trim()) next.role = fill.role.trim()
  if (blank(next.roleSpec) && fill.roleSpec?.trim()) next.roleSpec = fill.roleSpec.trim()
  if (fill.isOC === true) next.isOC = true
  if (fill.attributes) {
    for (const key of ATTRIBUTE_KEYS) {
      if (blank(next.attributes[key]) && fill.attributes[key]?.trim()) next.attributes[key] = fill.attributes[key].trim()
    }
  }
  return next
}

export function fillToDraft(fill: AiCharacterFill): CharacterDraft {
  return applyCharacterFill(emptyDraft(), fill)
}

export function fillToInput(fill: AiCharacterFill): CharacterInput {
  return draftToInput(fillToDraft(fill))
}

export function uniqueNewFills(fills: AiCharacterFill[], existingNames: string[]): AiCharacterFill[] {
  const held = new Set(existingNames.map((name) => name.trim().toLocaleLowerCase()).filter(Boolean))
  const seen = new Set<string>()
  return fills.filter((fill) => {
    const key = fill.name.trim().toLocaleLowerCase()
    if (!key || held.has(key) || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
