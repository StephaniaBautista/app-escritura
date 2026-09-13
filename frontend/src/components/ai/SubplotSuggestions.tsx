import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAiStore } from '@/stores/ai-store'
import { useStructureStore } from '@/stores/structure-store'
import { useAiCapabilities } from './useAiCapabilities'
import { useAiAnalysis } from './useAiAnalysis'
import { AiConsentNote, AiError, AiSources, ProtectedAiText } from './AiShared'
import type { AiSuggestion } from '@/types/ai'

export function SubplotSuggestions({ projectId }: { projectId: string }) {
  const { t, i18n } = useTranslation()
  const { capabilities } = useAiCapabilities(projectId)
  const provider = useAiStore((state) => state.provider)
  const analysis = useAiAnalysis(projectId, 'subplot-suggestions', { locale: i18n.language.startsWith('en') ? 'en' : 'es', ...(provider ? { provider } : {}) })
  const [accepted, setAccepted] = useState<string[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  if (!capabilities?.permissions.chat) return null
  const available = capabilities.providers.some((item) => item.available)

  const accept = async (suggestion: AiSuggestion) => {
    if (saving || !suggestion.relation) return
    setSaving(suggestion.id)
    setSaveError(null)
    const subplot = await useStructureStore.getState().createSubplot(projectId, { title: suggestion.title, description: `${t(`aiApp.relations.${suggestion.relation}`)}\n\n${suggestion.description}`, status: 'active' })
    if (subplot) setAccepted((ids) => [...ids, suggestion.id])
    else setSaveError('aiApp.errors.apply')
    setSaving(null)
  }

  return <section className="ai-panel notebook-paper p-4 space-y-3" aria-label={t('aiApp.subplotIdeas')}>
    <h3 className="font-display text-xl font-bold">{t('aiApp.subplotIdeas')}</h3>
    <p className="text-sm ai-panel__muted">{t('aiApp.subplotHint')}</p>
    <button type="button" className="ai-panel__button" disabled={!available || analysis.loading || !!saving} onClick={() => { setAccepted([]); void analysis.run() }}>{t(analysis.loading ? 'aiApp.analyzing' : 'aiApp.suggestSubplots')}</button>
    {!available && <p role="status" className="text-sm ai-panel__muted">{t('aiApp.noProvider')}</p>}
    <AiConsentNote />
    <AiError error={analysis.error || saveError} />
    <div aria-live="polite" aria-busy={analysis.loading} className="space-y-3">
      {analysis.result?.suggestions.length === 0 && <p className="text-sm ai-panel__muted">{t('aiApp.noSuggestions')}</p>}
      {analysis.result?.suggestions.map((suggestion) => <article key={suggestion.id} className="ai-panel__message">
        {suggestion.relation && <span className="text-xs font-semibold ai-panel__muted">{t(`aiApp.relations.${suggestion.relation}`)}</span>}
        <ProtectedAiText canCopy={capabilities.canCopy}><h4 className="text-sm font-semibold mt-1">{suggestion.title}</h4><p className="text-sm mt-1 whitespace-pre-wrap">{suggestion.description}</p></ProtectedAiText>
        <AiSources sources={analysis.result!.sources.filter((source) => suggestion.sourceIds.includes(source.id))} />
        <button type="button" className="ai-panel__button mt-2" disabled={!!saving || accepted.includes(suggestion.id) || !suggestion.relation} onClick={() => { void accept(suggestion) }}>{t(accepted.includes(suggestion.id) ? 'aiApp.subplotAdded' : saving === suggestion.id ? 'aiApp.saving' : 'aiApp.acceptSubplot')}</button>
      </article>)}
    </div>
  </section>
}
