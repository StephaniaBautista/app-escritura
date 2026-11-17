export type AiMode = 'adviser' | 'character'
export type AiLocale = 'es' | 'en'
export interface AiSource { id: string; type: string; title: string; excerpt: string }
export interface AiCapabilities {
  providers: { id: string; available: boolean; trainsData: boolean; comingSoon?: boolean }[]
  fallbackEnabled: boolean
  permissions: { chat: boolean; characters: boolean; suggestions: boolean }
  canCopy: boolean
  chapters: { id: string; title: string }[]
  pages: { id: string; title: string; type: 'document' | 'chapter' | 'subpage'; parentId: string | null }[]
  characters: { id: string; name: string }[]
}
export interface AiConversation {
  id: string
  projectId: string
  mode: AiMode
  title: string
  characterId: string | null
  chapterId: string | null
  createdAt: string
  updatedAt: string
}
export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: AiSource[]
  provider: string | null
  model: string | null
  createdAt: string
}
export interface AiConversationDetail extends AiConversation { messages: AiMessage[] }
export interface AiConversationInput { mode: AiMode; title?: string; characterId?: string; chapterId?: string }
export interface AiSendInput { direction?: string; webSearch?: boolean; message: string; requestId: string; provider?: string; locale: AiLocale }
export type ColumnPhase = 'beginning' | 'development' | 'climax' | 'ending'

export interface AiSuggestion {
  id: string
  kind: 'inconsistency' | 'plot_hole' | 'character_completion' | 'subplot' | 'chapter_order'
  title: string
  description: string
  sourceIds: string[]
  characterId?: string
  field?: string
  value?: string
  documentId?: string
  quote?: string
  relation?: 'intertwined' | 'complementary' | 'residual'
  chapterId?: string
  columnPhase?: ColumnPhase
}
export interface AiAnalysis {
  suggestions: AiSuggestion[]
  sources: AiSource[]
  provider: string
  model: string
}
export interface AiAnalysisInput {
  documentId?: string
  draftContent?: string
  characterId?: string
  subplotId?: string
  provider?: string
  locale: AiLocale
}
export type AiAnalysisKind = 'suggestions' | 'character-suggestions' | 'subplot-suggestions' | 'structure-suggestions'
export type AiWizardStage = 'description' | 'basics' | 'couples' | 'characters' | 'tags' | 'structure'
export interface AiWizardSuggestion {
  field: string
  title: string
  description: string
  value: unknown
}
export interface AiWizardCompletion {
  description: string | null
  meta: Record<string, unknown>
  suggestions: AiWizardSuggestion[]
  stage: AiWizardStage
  sources: AiSource[]
  provider: string
  model: string
}
export interface AiGenerationInput {
  provider?: string
  locale: AiLocale
}
export interface AiWizardInput extends AiGenerationInput {
  stage: AiWizardStage
}
export interface AiTagSuggestions {
  tags: string[]
  sources: AiSource[]
  provider: string
  model: string
}
export interface AiCharacterFill {
  name: string
  description?: string
  nicknames?: string[]
  age?: string
  gender?: string
  orientation?: string
  species?: string
  birthPlace?: string
  role?: string
  roleSpec?: string
  isOC?: boolean
  attributes?: Record<string, string>
}
export interface AiCharacterFillInput extends AiGenerationInput {
  characterId?: string
  name?: string
}
export interface AiCharacterFillResult {
  characters: AiCharacterFill[]
  sources: AiSource[]
  provider: string
  model: string
}
export interface AiTimelineEraFill {
  name: string
  startDate?: string
  endDate?: string
  precision?: string
  rollover?: string
  order?: number
}
export interface AiTimelineEventFill {
  title: string
  description?: string
  date?: string
  endDate?: string
  eraName?: string
  characterNames?: string[]
  precision?: string
  order?: number
}
export interface AiTimelineFillResult {
  eras: AiTimelineEraFill[]
  events: AiTimelineEventFill[]
  sources: AiSource[]
  provider: string
  model: string
}
