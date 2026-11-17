import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAiToolProvider } from '@/hooks/useAiToolProvider'
import { useCharactersStore } from '@/stores/characters-store'
import type { Character } from '@/types/character'
import type { AiSuggestion } from '@/types/ai'
import { useAiCapabilities } from './useAiCapabilities'
import { useAiAnalysis } from './useAiAnalysis'
import { AiConsentNote, AiError, AiSources, ProtectedAiText } from './AiShared'
import { characterFieldValue, characterSuggestionPatch } from './character-suggestions'
import { hasLocalWrittenDocuments } from '@/components/story-setup/wizard-ai'
import { useDocumentStore } from '@/stores/document-store'

export function CharacterSuggestions({ character }: { character: Character }) {
  const { t, i18n } = useTranslation()
  const { capabilities } = useAiCapabilities(character.projectId)
  const provider = useAiToolProvider('characters')
  const { documentTree, currentDocument } = useDocumentStore()
  const analysis = useAiAnalysis(character.projectId, 'character-suggestions', { characterId: character.id, locale: i18n.language.startsWith('en') ? 'en' : 'es', ...(provider ? { provider } : {}) })
  const [applied, setApplied] = useState<string[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  if (!capabilities?.permissions.characters) return null
  const available = capabilities.providers.some((item) => item.available)

  const extract = () => {
    setApplied([])
    if (!hasLocalWrittenDocuments(character.projectId, documentTree, currentDocument)) {
      setSaveError('aiApp.errors.empty')
      return
    }
    setSaveError(null)
    void analysis.run()
  }

  const apply = async (suggestion: AiSuggestion) => {
    if (!analysis.result || saving) return
    const current = useCharactersStore.getState().characters.find((item) => item.id === character.id)
    if (!current) return
    const patch = characterSuggestionPatch(current, suggestion, analysis.result)
    if (!patch) return
    setSaving(suggestion.id)
    setSaveError(null)
    const updated = await useCharactersStore.getState().update(character.id, patch)
    if (updated) setApplied((ids) => [...ids, suggestion.id])
    else setSaveError('aiApp.errors.apply')
    setSaving(null)
  }

  return <section className="ai-panel border-t pt-4 space-y-3" style={{ borderColor: 'var(--color-paper-lines)' }} aria-label={t('aiApp.completeCharacter')}>
    <h3 className="font-display text-xl font-bold">{t('aiApp.completeCharacter')}</h3>
    <p className="text-sm ai-panel__muted">{t('aiApp.characterCompletionHint')}</p>
    <button type="button" className="ai-panel__button" disabled={!available || analysis.loading || !!saving} onClick={extract}>{t(analysis.loading ? 'aiApp.analyzing' : 'aiApp.extractFields')}</button>
    {!available && <p role="status" className="text-sm ai-panel__muted">{t('aiApp.noProvider')}</p>}
    <AiConsentNote />
    <AiError error={analysis.error || saveError} />
    <div aria-live="polite" aria-busy={analysis.loading} className="space-y-3">
      {analysis.result?.suggestions.length === 0 && <p className="text-sm ai-panel__muted">{t('aiApp.noExtractedFields')}</p>}
      {analysis.result?.suggestions.map((suggestion) => <article key={suggestion.id} className="ai-panel__message">
        <h4 className="text-sm font-semibold">{t(`aiApp.fields.${suggestion.field?.replace('attributes.', '')}`)}</h4>
        <p className="text-xs ai-panel__muted mt-1">{t('aiApp.currentValue')}: {characterFieldValue(character, suggestion.field ?? '') || t('aiApp.emptyField')}</p>
        <ProtectedAiText canCopy={capabilities.canCopy}><p className="text-sm mt-2 whitespace-pre-wrap">{suggestion.value}</p><p className="text-xs ai-panel__muted mt-1">{suggestion.description}</p></ProtectedAiText>
        <AiSources sources={analysis.result!.sources.filter((source) => suggestion.sourceIds.includes(source.id))} />
        <button type="button" className="ai-panel__button mt-2" disabled={!!saving || applied.includes(suggestion.id) || !characterSuggestionPatch(character, suggestion, analysis.result!)} onClick={() => { void apply(suggestion) }}>{t(applied.includes(suggestion.id) ? 'aiApp.applied' : saving === suggestion.id ? 'aiApp.saving' : 'aiApp.acceptField')}</button>
      </article>)}
    </div>
  </section>
}
