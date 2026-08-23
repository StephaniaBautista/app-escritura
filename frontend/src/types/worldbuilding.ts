export type LoreType = 'magic' | 'faction' | 'religion' | 'location' | 'item' | 'custom'

export interface LoreEntry {
  id: string
  projectId: string
  name: string
  description: string | null
  type: string
  limits: string | null
  order: number
  createdAt: string
  updatedAt: string
}

export interface LoreEntryInput {
  name?: string
  description?: string | null
  type?: string
  limits?: string | null
  order?: number
}

export interface Race {
  id: string
  projectId: string
  name: string
  classification: string | null
  description: string | null
  physicalTraits: string | null
  hasMagic: boolean
  magicDescription: string | null
  lifeExpectancy: number | null
  language: string | null
  culture: string | null
  religion: string | null
  origin: string | null
  territory: string | null
  createdAt: string
  updatedAt: string
}

export interface RaceInput {
  name?: string
  classification?: string | null
  description?: string | null
  physicalTraits?: string | null
  hasMagic?: boolean
  magicDescription?: string | null
  lifeExpectancy?: number | null
  language?: string | null
  culture?: string | null
  religion?: string | null
  origin?: string | null
  territory?: string | null
}

export interface GlossaryEntry {
  id: string
  projectId: string
  word: string
  pronunciation: string | null
  meaning: string | null
  createdAt: string
  updatedAt: string
}

export interface GlossaryEntryInput {
  word?: string
  pronunciation?: string | null
  meaning?: string | null
}

export interface Creature {
  id: string
  projectId: string
  name: string
  species: string | null
  dangerType: string | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface CreatureInput {
  name?: string
  species?: string | null
  dangerType?: string | null
  description?: string | null
}

export interface Location {
  id: string
  projectId: string
  name: string
  description: string | null
  position: { x: number; y: number }
  createdAt: string
  updatedAt: string
}

export interface LocationInput {
  name?: string
  description?: string | null
  position?: { x: number; y: number }
}

export interface WorldRoute {
  id: string
  projectId: string
  locationAId: string
  locationBId: string
  label: string | null
  createdAt: string
  updatedAt: string
}

export interface WorldRouteInput {
  locationAId?: string
  locationBId?: string
  label?: string | null
}
