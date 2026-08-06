export type StoryRating = 'general' | 'teen' | 'mature' | 'explicit'

export type OptionType = 'rating' | 'storyType' | 'category' | 'narrator' | 'ending' | 'fandom' | 'tag' | 'problem' | 'ship' | 'character'

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
  fandoms?: string[]
  categories?: string[]
  ships?: string[]
  characters?: StoryCharacter[]
  tags?: string[]
  narrator?: string
  guidedMode?: boolean
  structure?: StoryStructure
  duration?: StoryDuration
  ending?: string
  protagonistLife?: string
  protagonistEvolution?: string
  initialState?: string
  initialPhysicalState?: string
  problems?: string[]
  extra?: Record<string, unknown>
}
