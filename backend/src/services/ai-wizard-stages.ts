import { allWizardStructurePromptsFilled, WIZARD_STRUCTURE_PROMPT_IDS } from '../lib/structure-prompts.js'
import type { WizardGap, WizardMeta } from './ai-wizard-eligibility.js'

export const WIZARD_STAGES = ['description', 'basics', 'couples', 'characters', 'tags', 'structure'] as const
export type WizardStage = (typeof WIZARD_STAGES)[number]
export type FieldQuality = 'empty' | 'thin' | 'solid'

export function isWizardStage(value: unknown): value is WizardStage {
  return typeof value === 'string' && (WIZARD_STAGES as readonly string[]).includes(value)
}

export function stageFields(stage: WizardStage, meta: WizardMeta): WizardGap[] {
  if (stage === 'description') return ['description']
  if (stage === 'basics') {
    const fields: WizardGap[] = ['rating', 'type', 'isFanfic']
    if (meta.isFanfic === true) fields.push('fandoms')
    return fields
  }
  if (stage === 'couples') return ['categories', 'ships']
  if (stage === 'characters') return ['characters']
  if (stage === 'tags') return ['tags', 'narrator']
  return ['structure']
}

function blank(value: unknown): boolean {
  return typeof value !== 'string' || !value.trim()
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : []
}

function arrayQuality(items: string[]): FieldQuality {
  if (items.length === 0) return 'empty'
  if (items.length === 1) return 'thin'
  return 'solid'
}

function textQuality(value: unknown, thinAt: number): FieldQuality {
  if (blank(value)) return 'empty'
  return (value as string).trim().length < thinAt ? 'thin' : 'solid'
}

function characterQuality(meta: WizardMeta): FieldQuality {
  const characters = Array.isArray(meta.characters) ? meta.characters : []
  const named = characters.filter((character) => !blank(character.name))
  if (named.length === 0) return 'empty'
  if (named.some((character) => !blank(character.initialState) || !blank(character.initialPhysicalState))) return 'solid'
  return 'thin'
}

function structureQuality(meta: WizardMeta): FieldQuality {
  const sections = meta.structure?.sections
  if (!Array.isArray(sections) || sections.length === 0) return 'empty'
  if (allWizardStructurePromptsFilled(sections)) return 'solid'
  const filled = WIZARD_STRUCTURE_PROMPT_IDS.filter((id) =>
    sections.some((section) => !blank(section.answers?.[id])),
  )
  return filled.length === 0 ? 'empty' : 'thin'
}

export function fieldQuality(field: WizardGap, description: string | null | undefined, meta: WizardMeta): FieldQuality {
  if (field === 'description') return textQuality(description, 80)
  if (field === 'rating' || field === 'narrator' || field === 'ending') return blank(meta[field]) ? 'empty' : 'solid'
  if (field === 'isFanfic') return typeof meta.isFanfic === 'boolean' ? 'solid' : 'empty'
  if (field === 'type') return arrayQuality(strings(meta.type))
  if (field === 'fandoms') return arrayQuality(strings(meta.fandoms))
  if (field === 'categories') return arrayQuality(strings(meta.categories))
  if (field === 'ships') return arrayQuality(strings(meta.ships))
  if (field === 'tags') return arrayQuality(strings(meta.tags))
  if (field === 'characters') return characterQuality(meta)
  if (field === 'structure') return structureQuality(meta)
  return textQuality(meta[field], 40)
}

export function completeFields(stage: WizardStage, description: string | null | undefined, meta: WizardMeta): WizardGap[] {
  return stageFields(stage, meta).filter((field) => {
    const quality = fieldQuality(field, description, meta)
    return quality === 'empty' || quality === 'thin'
  })
}

export function suggestFields(stage: WizardStage, description: string | null | undefined, meta: WizardMeta): WizardGap[] {
  return stageFields(stage, meta).filter((field) => fieldQuality(field, description, meta) === 'solid')
}
