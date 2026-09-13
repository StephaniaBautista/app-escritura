import type { Character, CharacterAttributes, CharacterInput } from '@/types/character'
import type { AiAnalysis, AiSuggestion } from '@/types/ai'

const fields = ['description', 'age', 'gender', 'species', 'birthPlace', 'role'] as const
const attributes = ['motivations', 'weaknesses', 'internalConflict', 'personality', 'virtues', 'flaws', 'jobStudies', 'clothing', 'skills', 'health', 'hobbies', 'extraData'] as const

export function characterSuggestionPatch(character: Character, suggestion: AiSuggestion, analysis: AiAnalysis): CharacterInput | null {
  if (suggestion.kind !== 'character_completion' || suggestion.characterId !== character.id || !suggestion.field || !suggestion.value?.trim()) return null
  if (!suggestion.sourceIds.length || !suggestion.sourceIds.every((id) => analysis.sources.some((source) => source.id === id))) return null
  if (fields.includes(suggestion.field as typeof fields[number])) return { [suggestion.field]: suggestion.value }
  const attribute = suggestion.field.startsWith('attributes.') ? suggestion.field.slice('attributes.'.length) : ''
  if (attributes.includes(attribute as keyof CharacterAttributes)) return { attributes: { ...character.attributes, [attribute]: suggestion.value } }
  return null
}

export function characterFieldValue(character: Character, field: string): string {
  if (fields.includes(field as typeof fields[number])) return character[field as typeof fields[number]] ?? ''
  const attribute = field.startsWith('attributes.') ? field.slice('attributes.'.length) : ''
  return attributes.includes(attribute as keyof CharacterAttributes) ? character.attributes[attribute as keyof CharacterAttributes] ?? '' : ''
}
