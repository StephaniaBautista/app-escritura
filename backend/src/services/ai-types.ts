import type { AiProvider } from '../lib/ai-client.js'

export type AiMode = 'adviser' | 'character'
export type AiLocale = 'es' | 'en'
export interface AiSource {
  id: string
  type: string
  title: string
  excerpt: string
}
export interface CreateAiConversation {
  mode: AiMode
  title?: string
  characterId?: string
  chapterId?: string
}
export interface AiMessageInput {
  message: string
  direction?: string
  webSearch?: boolean
  requestId: string
  provider?: AiProvider
  locale?: AiLocale
}
export interface AiSuggestionInput {
  documentId?: string
  draftContent?: string
  characterId?: string
  subplotId?: string
  provider?: AiProvider
  locale?: AiLocale
}
export type AiSuggestionKind = 'inconsistency' | 'plot_hole' | 'character_completion' | 'subplot' | 'chapter_order'
export type ColumnPhase = 'beginning' | 'development' | 'climax' | 'ending'
export interface AiSuggestion {
  id: string
  kind: AiSuggestionKind
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
export const AI_VALIDATION_ISSUES = [
  'shape', 'expected_object', 'expected_string', 'empty_string', 'text_too_long', 'invalid_json',
  'expected_array', 'array_too_long', 'unexpected_fields', 'empty_response', 'unsupported_kind',
  'missing_source', 'unknown_source', 'discontinuous_quote', 'quote_mismatch', 'requested_document_mismatch',
  'unsupported_field', 'missing_scope', 'literal_value_mismatch', 'unsupported_relation',
  'unsupported_phase', 'unknown_chapter',
] as const
export type AiValidationIssue = typeof AI_VALIDATION_ISSUES[number]

export class AiServiceError extends Error {
  constructor(public code: string, public statusCode: number, public validationIssue?: AiValidationIssue) {
    super(code)
    this.name = 'AiServiceError'
  }
}
