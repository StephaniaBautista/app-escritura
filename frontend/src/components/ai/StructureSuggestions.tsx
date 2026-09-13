import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, X } from 'lucide-react'
import { useAiStore } from '@/stores/ai-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useStructureStore } from '@/stores/structure-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAiCapabilities } from './useAiCapabilities'
import { useAiAnalysis } from './useAiAnalysis'
import { AiError, AiSources, ProtectedAiText } from './AiShared'
import { findCardByChapterId, resolveColumnForPhase } from '@/lib/structure-chapters'
import type { AiSuggestion, ColumnPhase } from '@/types/ai'
import type { StructureBoard } from '@/types/structure'
import './ai.css'

interface StructureSuggestionsProps {
  projectId: string
  board: StructureBoard | null
}

export function StructureSuggestions({ projectId, board }: StructureSuggestionsProps) {
  const { t, i18n } = useTranslation()
  const { capabilities } = useAiCapabilities(projectId)
  const provider = useAiStore((state) => state.provider)
  const fallback = useAiStore((state) => state.capabilities?.fallbackEnabled)
  const { loadSettings, dismissAiStructureWarning } = useSettingsStore()
  const warningDismissed = useSettingsStore((state) => state.settings?.uiPrefs?.dismissAiStructureWarning === true)
  const { createCard, moveCard, syncChapters } = useStructureStore()
  const analysis = useAiAnalysis(projectId, 'structure-suggestions', {
    locale: i18n.language.startsWith('en') ? 'en' : 'es',
    ...(provider ? { provider } : {}),
  })
  const [warningOpen, setWarningOpen] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [accepted, setAccepted] = useState<string[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  if (!capabilities?.permissions.chat || !board) return null
  const available = capabilities.providers.some((item) => item.available)

  const chapterTitle = (chapterId: string) =>
    capabilities.pages.find((page) => page.id === chapterId)?.title
    ?? capabilities.chapters.find((chapter) => chapter.id === chapterId)?.title
    ?? chapterId

  const runSuggestions = () => {
    setAccepted([])
    setSaveError(null)
    setSuggestionsOpen(true)
    void analysis.run()
  }

  const handleTrigger = () => {
    if (warningDismissed) {
      runSuggestions()
      return
    }
    setDontShowAgain(false)
    setWarningOpen(true)
  }

  const handleWarningConfirm = async () => {
    setWarningOpen(false)
    if (dontShowAgain) {
      try {
        await dismissAiStructureWarning()
      } catch {
        /* proceed even if preference save fails */
      }
    }
    runSuggestions()
  }

  const accept = async (suggestion: AiSuggestion) => {
    if (saving || !suggestion.chapterId || !suggestion.columnPhase) return
    const column = resolveColumnForPhase(board.columns ?? [], suggestion.columnPhase as ColumnPhase)
    if (!column) {
      setSaveError('structureApp.errorApplySuggestion')
      return
    }
    setSaving(suggestion.id)
    setSaveError(null)
    let card = findCardByChapterId(board, suggestion.chapterId)
    if (!card) {
      await syncChapters(board.id)
      const refreshed = useStructureStore.getState().boards.find((item) => item.id === board.id) ?? board
      card = findCardByChapterId(refreshed, suggestion.chapterId)
      if (!card) {
        card = await createCard(column.id, {
          title: chapterTitle(suggestion.chapterId),
          cardType: 'chapter',
          referenceId: suggestion.chapterId,
        })
      }
    }
    if (!card) {
      setSaveError('aiApp.errors.apply')
      setSaving(null)
      return
    }
    const targetCards = (column.cards ?? []).filter((item) => item.id !== card!.id)
    await moveCard(card.id, column.id, targetCards.length)
    setAccepted((ids) => [...ids, suggestion.id])
    setSaving(null)
  }

  const warningMessage = fallback
    ? `${t('aiApp.contextNotice')} ${t('aiApp.fallbackNotice')}`
    : t('aiApp.contextNotice')

  return (
    <>
      <button
        type="button"
        disabled={!available || analysis.loading || !!saving}
        onClick={handleTrigger}
        className="flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"
        style={{
          borderColor: 'var(--color-paper-lines)',
          color: 'var(--color-ink)',
          background: 'var(--color-paper)',
        }}
      >
        <Sparkles className="w-4 h-4 shrink-0" style={{ color: 'var(--color-accent-violet)' }} />
        {t('structureApp.aiSuggestions')}
      </button>

      <ConfirmDialog
        isOpen={warningOpen}
        title={t('structureApp.aiWarningTitle')}
        message={warningMessage}
        confirmLabel={t('structureApp.continueWithAi')}
        cancelLabel={t('common.cancel')}
        variant="default"
        onConfirm={() => { void handleWarningConfirm() }}
        onCancel={() => setWarningOpen(false)}
      >
        <label className="mt-4 flex items-start gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-ink-light)' }}>
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.target.checked)}
            className="mt-0.5"
          />
          <span>{t('structureApp.dontShowAgain')}</span>
        </label>
      </ConfirmDialog>

      {suggestionsOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('structureApp.aiSuggestions')}
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setSuggestionsOpen(false)} />
          <div
            className="relative ai-panel notebook-paper w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 shadow-2xl space-y-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold">{t('structureApp.aiSuggestions')}</h3>
                <p className="text-sm ai-panel__muted mt-1">{t('structureApp.aiSuggestionsHint')}</p>
              </div>
              <button
                type="button"
                onClick={() => setSuggestionsOpen(false)}
                aria-label={t('common.cancel')}
                className="hover:opacity-70"
              >
                <X className="w-5 h-5" style={{ color: 'var(--color-ink-light)' }} />
              </button>
            </div>
            <button
              type="button"
              className="ai-panel__button"
              disabled={!available || analysis.loading || !!saving}
              onClick={() => { setAccepted([]); void analysis.run() }}
            >
              {t(analysis.loading ? 'aiApp.analyzing' : 'structureApp.suggestOrder')}
            </button>
            {!available && <p role="status" className="text-sm ai-panel__muted">{t('aiApp.noProvider')}</p>}
            <AiError error={analysis.error || saveError} />
            <div aria-live="polite" aria-busy={analysis.loading} className="space-y-3">
              {analysis.result?.suggestions.length === 0 && (
                <p className="text-sm ai-panel__muted">{t('aiApp.noSuggestions')}</p>
              )}
              {analysis.result?.suggestions.map((suggestion) => (
                <article key={suggestion.id} className="ai-panel__message">
                  {suggestion.columnPhase && (
                    <span className="text-xs font-semibold ai-panel__muted">
                      {t(`structureApp.phases.${suggestion.columnPhase}`)}
                    </span>
                  )}
                  <ProtectedAiText canCopy={capabilities.canCopy}>
                    <h4 className="text-sm font-semibold mt-1">{suggestion.title}</h4>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{suggestion.description}</p>
                  </ProtectedAiText>
                  <AiSources sources={analysis.result!.sources.filter((source) => suggestion.sourceIds.includes(source.id))} />
                  <button
                    type="button"
                    className="ai-panel__button mt-2"
                    disabled={!!saving || accepted.includes(suggestion.id) || !suggestion.chapterId || !suggestion.columnPhase}
                    onClick={() => { void accept(suggestion) }}
                  >
                    {t(
                      accepted.includes(suggestion.id)
                        ? 'structureApp.suggestionApplied'
                        : saving === suggestion.id
                          ? 'aiApp.saving'
                          : 'structureApp.applySuggestion',
                    )}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
