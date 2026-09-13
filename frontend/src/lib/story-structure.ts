import type { StoryMeta, StoryStructure, StoryStructureSection } from '@/types/story'

export const STANDARD_SECTION_IDS = ['inicio', 'desarrollo', 'climax', 'final'] as const

const STANDARD_SECTION_LABEL_KEYS: Record<string, string> = {
  inicio: 'storySetup.structureInicio',
  desarrollo: 'storySetup.structureDesarrollo',
  climax: 'storySetup.structureClimax',
  final: 'storySetup.structureFinal',
}

export function isStandardSection(id: string): boolean {
  return (STANDARD_SECTION_IDS as readonly string[]).includes(id)
}

export function sectionLabelKey(id: string): string {
  return STANDARD_SECTION_LABEL_KEYS[id] ?? ''
}

// Migra el formato legacy { inicio?, desarrollo?, climax?, final? } al nuevo { sections: [...] }
export function migrateStructure(raw: unknown): StoryStructure {
  if (!raw || typeof raw !== 'object') return { sections: [] }
  const s = raw as Record<string, unknown>

  if (Array.isArray(s.sections)) {
    const sections: StoryStructureSection[] = s.sections.flatMap((sec) => {
      if (typeof sec !== 'object' || sec === null) return []
      const section = sec as Record<string, unknown>
      const id = typeof section.id === 'string' && section.id ? section.id : ''
      if (!id) return []
      return [
        {
          id,
          title: typeof section.title === 'string' ? section.title : undefined,
          content: typeof section.content === 'string' ? section.content : '',
          answers:
            section.answers && typeof section.answers === 'object'
              ? (section.answers as Record<string, string>)
              : undefined,
          scenes: parseScenes(section.scenes),
        },
      ]
    })
    return {
      templateId: typeof s.templateId === 'string' ? s.templateId : undefined,
      sections,
    }
  }

  const sections: StoryStructureSection[] = []
  for (const id of STANDARD_SECTION_IDS) {
    const content = s[id]
    if (typeof content === 'string' && content.trim()) {
      sections.push({ id, content })
    }
  }
  return { sections }
}

function parseScenes(raw: unknown): StoryStructureSection['scenes'] {
  if (!Array.isArray(raw)) return undefined
  const scenes: NonNullable<StoryStructureSection['scenes']> = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const title = typeof row.title === 'string' ? row.title.trim().slice(0, 80) : ''
    if (!title) continue
    const form = row.form === 'note' ? 'note' : row.form === 'chapter' ? 'chapter' : null
    if (!form) continue
    scenes.push({ title, form })
    if (scenes.length >= 6) break
  }
  return scenes.length > 0 ? scenes : undefined
}

export function storyMetaSections(meta: StoryMeta): StoryStructureSection[] {
  return migrateStructure(meta.structure).sections
}
