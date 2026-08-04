export type StoryRating = 'general' | 'teen' | 'mature' | 'explicit'

export interface StoryCharacter {
  name: string
  isOC: boolean
}

export interface StoryStructure {
  inicio?: string
  desarrollo?: string
  climax?: string
  final?: string
}

export interface StoryDuration {
  chapters?: number
  words?: number
}

export interface StoryMeta {
  rating?: StoryRating
  type?: string[]
  isFanfic?: boolean
  fandom?: string
  categories?: string[]
  ships?: string[]
  characters?: StoryCharacter[]
  tags?: string[]
  narrator?: string
  structure?: StoryStructure
  duration?: StoryDuration
  ending?: string
  protagonistLife?: string
  characterEvolution?: string
  initialState?: string
  problems?: string[]
  extra?: Record<string, unknown>
}
