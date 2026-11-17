import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SearchCheck } from 'lucide-react'
import { useAiStore } from '@/stores/ai-store'
import type { AiSuggestion } from '@/types/ai'
import { useAiAnalysis } from './useAiAnalysis'
import { AiConsentNote, AiError, AiProviderSelect, AiSources, ProtectedAiText } from './AiShared'

interface SuggestionsPanelProps {
  projectId: string
  documentId?: string
  draftContent?: string
  onSuggestionsChange?: (suggestions: AiSuggestion[]) => void
  onReveal?: (suggestion: AiSuggestion) => void
}

export function SuggestionsPanel({ projectId, documentId, draftContent, onSuggestionsChange, onReveal }: SuggestionsPanelProps) {
  const { t, i18n } = useTranslation()
  const [live, setLive] = useState(false)
  const { provider, capabilities } = useAiStore()
  const analysis = useAiAnalysis(projectId, 'suggestions', { documentId, ...(draftContent === undefined ? {} : { draftContent }), ...(provider ? { provider } : {}), locale: i18n.language.startsWith('en') ? 'en' : 'es' })
  const tooLong = (draftContent?.length ?? 0) > 56000
  const available = capabilities?.providers.some((item) => item.available)
  const allowed = capabilities?.permissions.suggestions && available && !tooLong

  useEffect(() => { onSuggestionsChange?.(analysis.result?.suggestions ?? []) }, [analysis.result, onSuggestionsChange])
  useEffect(() => () => { onSuggestionsChange?.([]) }, [onSuggestionsChange])
  const runAnalysis = analysis.run
  useEffect(() => {
    if (!live || !allowed || !documentId) return
    const timeout = window.setTimeout(() => { void runAnalysis() }, 1800)
    return () => window.clearTimeout(timeout)
  }, [live, allowed, documentId, runAnalysis])

  return <section className="ai-panel space-y-4" aria-label={t('aiApp.suggestions')}>
    <p className="text-sm ai-panel__muted">{t('aiApp.suggestionsHint')}</p>
    <AiProviderSelect />
    {documentId && <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={live} disabled={!allowed} onChange={(event) => { setLive(event.target.checked); if (!event.target.checked) analysis.cancel() }} />{t('aiApp.liveSuggestions')}</label>}
    {tooLong && <p role="status" className="text-sm ai-panel__muted">{t('aiApp.draftLimit', { count: 56000 })}</p>}
    {!available && <p role="status" className="text-sm ai-panel__muted">{t('aiApp.noProvider')}</p>}
    <button type="button" className="ai-panel__button ai-panel__button--primary" disabled={!allowed || analysis.loading} onClick={() => { void analysis.run() }}><SearchCheck className="h-4 w-4" />{t(analysis.loading ? 'aiApp.analyzing' : 'aiApp.analyze')}</button>
    <AiConsentNote />
    <AiError error={analysis.error} onRetry={() => { void analysis.run() }} />
    <div className="space-y-4" aria-live="polite" aria-busy={analysis.loading}>
      {analysis.result?.suggestions.length === 0 && <p className="text-sm ai-panel__muted">{t('aiApp.noSuggestions')}</p>}
      {analysis.result?.suggestions.map((suggestion) => <article key={suggestion.id} className="ai-panel__message">
        <span className="text-xs font-semibold ai-panel__muted">{t(`aiApp.kinds.${suggestion.kind}`)}</span>
        <ProtectedAiText canCopy={capabilities?.canCopy === true}><h3 className="text-sm font-semibold mt-1">{suggestion.title}</h3><p className="text-sm mt-1 whitespace-pre-wrap">{suggestion.description}</p></ProtectedAiText>
        {suggestion.quote && <blockquote className="my-2 pl-3 border-l text-sm ai-panel__muted">{suggestion.quote}</blockquote>}
        {onReveal && suggestion.documentId === documentId && suggestion.quote && draftContent?.includes(suggestion.quote) && <button type="button" className="ai-panel__button mt-2" onClick={() => onReveal(suggestion)}>{t('aiApp.revealPassage')}</button>}
        <AiSources sources={analysis.result!.sources.filter((source) => suggestion.sourceIds.includes(source.id))} />
      </article>)}
      {analysis.result && <p className="text-xs ai-panel__muted">{t('aiApp.analysisDone')}</p>}
    </div>
  </section>
}
