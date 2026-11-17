import { useEffect } from 'react'
import { ReviewNotes } from './DocumentReview'
import { useDocumentReview } from './useDocumentReview'
import type { AiSuggestion } from '@/types/ai'

interface EditorReviewPanelProps {
  projectId: string
  documentId: string
  draftContent: string | undefined
  visible: boolean
  onActiveChange: (active: boolean) => void
  onSuggestionsChange: (suggestions: AiSuggestion[]) => void
  onReveal: (suggestion: AiSuggestion) => void
}

export function EditorReviewPanel({
  projectId,
  documentId,
  draftContent,
  visible,
  onActiveChange,
  onSuggestionsChange,
  onReveal,
}: EditorReviewPanelProps) {
  const review = useDocumentReview(projectId, documentId, draftContent, onSuggestionsChange)

  useEffect(() => { onActiveChange(review.active) }, [review.active, onActiveChange])

  if (!visible) return null

  return (
    <ReviewNotes
      active={review.active}
      suggestions={review.suggestions}
      analysis={review.result}
      loading={review.loading}
      error={review.error}
      documentId={documentId}
      draftContent={draftContent}
      tooLong={review.tooLong}
      available={review.available}
      canCopy={review.canCopy}
      onEnable={review.enable}
      onDisable={review.disable}
      onRetry={review.retry}
      onReveal={onReveal}
    />
  )
}
