import type { StoryStructureSection } from '@/types/story'

export type StructurePromptId =
  | 'wizard:inicio:status'
  | 'wizard:inicio:crack'
  | 'wizard:desarrollo:inciting'
  | 'wizard:desarrollo:effect'
  | 'wizard:desarrollo:scenes'
  | 'wizard:climax:peak'
  | 'wizard:climax:now'
  | 'wizard:final:arrive'
  | 'wizard:final:change'

export type SceneForm = 'chapter' | 'note'

export interface StructureSceneSuggestion {
  title: string
  form: SceneForm
}

export interface StructurePrompt {
  id: StructurePromptId
  labelKey: string
  placeholderKey: string
  hintKey?: string
}

const PROMPTS: Record<string, StructurePrompt[]> = {
  inicio: [
    {
      id: 'wizard:inicio:status',
      labelKey: 'storySetup.structurePromptInicioStatus',
      placeholderKey: 'storySetup.structurePromptInicioStatusPh',
    },
    {
      id: 'wizard:inicio:crack',
      labelKey: 'storySetup.structurePromptInicioCrack',
      placeholderKey: 'storySetup.structurePromptInicioCrackPh',
    },
  ],
  desarrollo: [
    {
      id: 'wizard:desarrollo:inciting',
      labelKey: 'storySetup.structurePromptDesarrolloInciting',
      placeholderKey: 'storySetup.structurePromptDesarrolloIncitingPh',
    },
    {
      id: 'wizard:desarrollo:effect',
      labelKey: 'storySetup.structurePromptDesarrolloEffect',
      placeholderKey: 'storySetup.structurePromptDesarrolloEffectPh',
    },
    {
      id: 'wizard:desarrollo:scenes',
      labelKey: 'storySetup.structurePromptDesarrolloScenes',
      placeholderKey: 'storySetup.structurePromptDesarrolloScenesPh',
      hintKey: 'storySetup.structurePromptDesarrolloScenesHint',
    },
  ],
  climax: [
    {
      id: 'wizard:climax:peak',
      labelKey: 'storySetup.structurePromptClimaxPeak',
      placeholderKey: 'storySetup.structurePromptClimaxPeakPh',
    },
    {
      id: 'wizard:climax:now',
      labelKey: 'storySetup.structurePromptClimaxNow',
      placeholderKey: 'storySetup.structurePromptClimaxNowPh',
    },
  ],
  final: [
    {
      id: 'wizard:final:arrive',
      labelKey: 'storySetup.structurePromptFinalArrive',
      placeholderKey: 'storySetup.structurePromptFinalArrivePh',
    },
    {
      id: 'wizard:final:change',
      labelKey: 'storySetup.structurePromptFinalChange',
      placeholderKey: 'storySetup.structurePromptFinalChangePh',
    },
  ],
}

const LABEL_BY_ID = new Map<string, string>(
  Object.values(PROMPTS).flatMap((prompts) => prompts.map((prompt) => [prompt.id, prompt.labelKey])),
)

export const DESARROLLO_SCENES_PROMPT_ID: StructurePromptId = 'wizard:desarrollo:scenes'

export function structurePromptsFor(sectionId: string): StructurePrompt[] {
  return PROMPTS[sectionId] ?? []
}

export function isStructurePromptId(id: string): id is StructurePromptId {
  return LABEL_BY_ID.has(id)
}

export function structurePromptLabelKey(id: string): string | undefined {
  return LABEL_BY_ID.get(id)
}

export const WIZARD_STRUCTURE_PROMPT_IDS: StructurePromptId[] = Object.values(PROMPTS).flatMap((prompts) =>
  prompts.map((prompt) => prompt.id),
)

export function allWizardStructurePromptsFilled(
  sections: { answers?: Record<string, string | undefined> }[] | undefined,
): boolean {
  if (!Array.isArray(sections)) return false
  return WIZARD_STRUCTURE_PROMPT_IDS.every((id) =>
    sections.some((section) => Boolean(section.answers?.[id]?.trim())),
  )
}

export function hasStructurePromptAnswers(section: StoryStructureSection): boolean {
  const answers = section.answers
  if (!answers) return false
  return structurePromptsFor(section.id).some((prompt) => answers[prompt.id]?.trim())
}

export function structurePromptValue(section: StoryStructureSection, prompt: StructurePrompt, index: number): string {
  const current = section.answers?.[prompt.id]
  if (current?.trim()) return current
  if (index === 0 && !hasStructurePromptAnswers(section) && section.content?.trim()) {
    return section.content
  }
  return current ?? ''
}

const SCENE_LINE = /^(capítulo|chapter|nota|note)\s*[:\-–]\s*(.+)$/i

export function parseSceneSuggestions(text: string): StructureSceneSuggestion[] {
  const scenes: StructureSceneSuggestion[] = []
  const seen = new Set<string>()
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim()
    if (!line) continue
    const match = line.match(SCENE_LINE)
    const title = (match ? match[2] : line).trim().slice(0, 80)
    if (!title) continue
    const marker = match?.[1]?.toLowerCase() ?? 'capítulo'
    const form: SceneForm = marker === 'nota' || marker === 'note' ? 'note' : 'chapter'
    const key = `${form}:${title.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    scenes.push({ title, form })
    if (scenes.length >= 6) break
  }
  return scenes
}

export function formatSceneSuggestions(scenes: StructureSceneSuggestion[], locale: 'es' | 'en' = 'es'): string {
  const chapter = locale === 'en' ? 'chapter' : 'capítulo'
  const note = locale === 'en' ? 'note' : 'nota'
  return scenes
    .map((scene) => `${scene.form === 'note' ? note : chapter}: ${scene.title}`)
    .join('\n')
}
