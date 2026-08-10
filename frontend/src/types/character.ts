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
  attributes: CharacterAttributes
  createdAt: string
  updatedAt: string
  evolutions?: Character[]
}

export type CharacterInput = Partial<Omit<Character, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'evolutions' | 'evolvesFromId' | 'evolutionReason'>>
