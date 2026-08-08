export type StoryRating = 'general' | 'teen' | 'mature' | 'explicit'

export type OptionType = 'rating' | 'storyType' | 'category' | 'narrator' | 'ending' | 'fandom' | 'tag' | 'problem' | 'ship' | 'character'

export interface StoryCharacter {
  name: string
  isOC: boolean
  initialState?: string
  initialPhysicalState?: string
}

export interface StoryStructureSection {
  id: string
  title?: string
  content?: string
  answers?: Record<string, string>
}

export interface StoryStructure {
  templateId?: string
  sections: StoryStructureSection[]
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
  worldContext?: string
  initialSituation?: string
  centralTheme?: string
  problems?: string
  bankAnswers?: Record<string, string>
  extra?: Record<string, unknown>
}
