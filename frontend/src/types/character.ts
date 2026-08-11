export interface CharacterAttributes {
  motivations?: string
  weaknesses?: string
  internalConflict?: string
  personality?: string
  virtues?: string
  flaws?: string
  jobStudies?: string
  clothing?: string
  skills?: string
  health?: string
  hobbies?: string
  extraData?: string
}

export const SHEET_BACKGROUND_MODES = ['default', 'single', 'collage'] as const
export type SheetBackgroundMode = typeof SHEET_BACKGROUND_MODES[number]

export const CHARACTER_OPTION_TYPES = ['gender', 'orientation', 'maritalStatus', 'role'] as const
export type CharacterOptionType = (typeof CHARACTER_OPTION_TYPES)[number]

export interface CharacterOptionRow {
  id: string
  type: CharacterOptionType
  value: string
  label: string
  labelEn: string | null
  sortOrder: number
  isDefault: boolean
}

export interface CharacterOptionGroup {
  type: CharacterOptionType
  options: CharacterOptionRow[]
}

export const STORY_POINTS = ['inicio', 'desarrollo', 'climax', 'final'] as const
export type StoryPoint = typeof STORY_POINTS[number]

export const STORY_POINT_ORDER: Record<StoryPoint, number> = { inicio: 0, desarrollo: 1, climax: 2, final: 3 }

export function storyPointsAfter(point: StoryPoint | null | undefined): StoryPoint[] {
  const current = point ? STORY_POINT_ORDER[point] : -1
  return STORY_POINTS.filter((p) => STORY_POINT_ORDER[p] > current)
}

export interface Character {
  id: string
  projectId: string
  name: string
  description: string | null
  imageUrl: string | null
  sheetBackgroundMode: SheetBackgroundMode
  sheetBackgroundImages: string[]
  nicknames: string[]
  age: string | null
  gender: string | null
  heightCm: number | null
  orientation: string | null
  maritalStatus: string | null
  species: string | null
  birthPlace: string | null
  birthDate: string | null
  role: string | null
  roleSpec: string | null
  isOC: boolean
  parentIds: string[]
  evolvesFromId: string | null
  evolutionReason: string | null
  storyPoint: StoryPoint | null
  attributes: CharacterAttributes
  createdAt: string
  updatedAt: string
  evolutions?: Character[]
}

export type CharacterInput = Partial<Omit<Character, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'evolutions' | 'evolvesFromId' | 'evolutionReason'>>
