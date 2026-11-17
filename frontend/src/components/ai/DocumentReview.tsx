import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Loader2, MessageSquareText, Power, PowerOff } from 'lucide-react'
import { AiConsentNote, AiError, AiSources, ProtectedAiText } from './AiShared'
import type { AiAnalysis, AiSuggestion } from '@/types/ai'

export function ReviewToggle({
  visible,
  active,
  loading,
  onToggleVisibility,
}: {
  visible: boolean
  active: boolean
  loading?: boolean
  onToggleVisibility: () => void
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      className="ai-panel__button"
      aria-pressed={visible}
      aria-label={t(visible ? 'aiApp.reviewHide' : 'aiApp.reviewShow')}
      title={t(visible ? 'aiApp.reviewHide' : 'aiApp.reviewShow')}
      onClick={onToggleVisibility}
      data-testid="review-toggle"
    >
      {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      <span className="hidden sm:inline">{t('aiApp.reviewToggle')}</span>
      {visible && active && loading && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
    </button>
  )
}

interface ReviewNotesProps {
  active: boolean
  suggestions: AiSuggestion[]
  analysis: AiAnalysis | null
  loading: boolean
  error: string | null
  documentId: string
  draftContent?: string
  tooLong: boolean
  available: boolean
  canCopy?: boolean
  onEnable: () => void
  onDisable: () => void
  onRetry: () => void
  onReveal: (suggestion: AiSuggestion) => void
}

export function ReviewNotes({
  active,
  suggestions,
  analysis,
  loading,
  error,
  documentId,
  draftContent,
  tooLong,
  available,
  canCopy,
  onEnable,
  onDisable,
  onRetry,
  onReveal,
}: ReviewNotesProps) {
  const { t } = useTranslation()
  return (
    <aside className="ai-review-rail" aria-label={t('aiApp.reviewComments')} data-testid="review-notes">
      <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: 'var(--color-paper-lines)' }}>
        <MessageSquareText className="h-4 w-4 shrink-0" style={{ color: 'var(--color-accent)' }} />
        <h3 className="min-w-0 flex-1 truncate font-display text-sm font-semibold">{t('aiApp.reviewComments')}</h3>
        <span className="text-xs ai-panel__muted">{active ? suggestions.length : 0}</span>
      </div>

      <div className="border-b px-3 py-2" style={{ borderColor: 'var(--color-paper-lines)' }}>
        <button
          type="button"
          className="ai-panel__button w-full"
          onClick={active ? onDisable : onEnable}
          data-testid="review-power"
        >
          {active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          {t(active ? 'aiApp.reviewDeactivate' : 'aiApp.reviewActivate')}
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3" aria-live="polite" aria-busy={active && loading}>
        {!active && (
          <p role="status" className="text-sm ai-panel__muted">{t('aiApp.reviewDeactivatedHint')}</p>
        )}
        {active && (
          <>
            {tooLong && <p role="status" className="text-sm ai-panel__muted">{t('aiApp.draftLimit', { count: 56000 })}</p>}
            {!available && <p role="status" className="text-sm ai-panel__muted">{t('aiApp.noProvider')}</p>}
            <AiConsentNote />
            <AiError error={error} onRetry={onRetry} />
            {loading && <p role="status" className="text-sm ai-panel__muted">{t('aiApp.analyzing')}</p>}
            {!loading && analysis?.suggestions.length === 0 && (
              <p className="text-sm ai-panel__muted">{t('aiApp.noSuggestions')}</p>
            )}
            {suggestions.map((suggestion) => (
              <article key={suggestion.id} className="ai-panel__comment">
                <span className="text-xs font-semibold ai-panel__muted">{t(`aiApp.kinds.${suggestion.kind}`)}</span>
                <ProtectedAiText canCopy={canCopy === true}>
                  <h4 className="mt-1 text-sm font-semibold">{suggestion.title}</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{suggestion.description}</p>
                </ProtectedAiText>
                {suggestion.quote && (
                  <blockquote className="my-2 border-l pl-3 text-sm ai-panel__muted">{suggestion.quote}</blockquote>
                )}
                {suggestion.documentId === documentId && suggestion.quote && draftContent?.includes(suggestion.quote) && (
                  <button type="button" className="ai-panel__button mt-2" onClick={() => onReveal(suggestion)}>
                    {t('aiApp.revealPassage')}
                  </button>
                )}
                {analysis && (
                  <AiSources sources={analysis.sources.filter((source) => suggestion.sourceIds.includes(source.id))} />
                )}
              </article>
            ))}
          </>
        )}
      </div>
    </aside>
  )
}
