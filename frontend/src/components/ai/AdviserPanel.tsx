import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSquare, PanelRightClose, Plus, Search, Send, Sparkles, Trash2 } from 'lucide-react'
import { useAiStore } from '@/stores/ai-store'
import { useAiCapabilities } from './useAiCapabilities'
import { AiConsentNote, AiError, AiProviderSelect, AiSources, ProtectedAiText } from './AiShared'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import '@/components/ai/ai.css'

interface AdviserPanelProps {
  projectId: string
  open?: boolean
  onClose?: () => void
}

export function AdviserPanel({ projectId, open = true, onClose }: AdviserPanelProps) {
  const { t, i18n } = useTranslation()
  const state = useAiStore()
  useAiCapabilities(projectId)
  const [draft, setDraft] = useState('')
  const [direction, setDirection] = useState('')
  const [showDirection, setShowDirection] = useState(false)
  const [showModes, setShowModes] = useState(false)
  const [webSearch, setWebSearch] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const sendingRef = useRef(false)
  const sameProject = state.projectId === projectId
  const conversations = sameProject
    ? state.conversations.filter((conversation) => conversation.mode === 'adviser')
    : []
  const active = conversations.find((conversation) => conversation.id === state.activeId)
  const allowed = sameProject && state.capabilities?.permissions.chat
  const available = state.capabilities?.providers.some((provider) => provider.available)
  const ready = !!allowed && !!available

  const loadConversations = state.loadConversations
  useEffect(() => { if (allowed) void loadConversations(projectId) }, [projectId, allowed, loadConversations])
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }) }, [state.messages, state.sending])
  useEffect(() => {
    if (open) composerRef.current?.focus()
  }, [open, active?.id])

  const send = async () => {
    if (!draft.trim() || !ready || sendingRef.current || state.sending) return
    sendingRef.current = true
    const message = draft
    try {
      let id = useAiStore.getState().activeId
      const current = useAiStore.getState().conversations.find((conversation) => conversation.id === id && conversation.mode === 'adviser')
      if (!current) {
        id = await state.createConversation({ mode: 'adviser', title: t('aiApp.newAdviser') })
        if (!id) return
      }
      const success = await state.send(message, i18n.language.startsWith('en') ? 'en' : 'es', direction || undefined, webSearch)
      if (success && useAiStore.getState().activeId === id) setDraft((currentDraft) => (currentDraft === message ? '' : currentDraft))
    } finally {
      sendingRef.current = false
    }
  }

  const onComposerKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    void send()
  }

  return (
    <div className="ai-panel ai-adviser flex h-full min-h-0 flex-col" data-testid="adviser-panel" aria-label={t('aiApp.adviserTitle')}>
      <header className="ai-adviser__header">
        <Sparkles className="h-4 w-4 shrink-0" style={{ color: 'var(--color-accent)' }} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-sm font-semibold">{t('aiApp.adviserTitle')}</h2>
          <p className="truncate text-xs ai-panel__muted">{t('aiApp.adviserSubtitle')}</p>
        </div>
        {onClose && (
          <button type="button" className="ai-panel__icon" onClick={onClose} aria-label={t('aiApp.close')}>
            <PanelRightClose className="h-4 w-4" />
          </button>
        )}
      </header>

      <div className="ai-adviser__toolbar">
        <label className="min-w-0 flex-1 text-xs ai-panel__muted">
          <span className="sr-only">{t('aiApp.history')}</span>
          <select
            className="ai-panel__control"
            value={active?.id ?? ''}
            disabled={state.sending}
            aria-label={t('aiApp.history')}
            onChange={(event) => { setDraft(''); void state.open(event.target.value || null) }}
          >
            <option value="">{t('aiApp.chooseConversation')}</option>
            {conversations.map((conversation) => (
              <option key={conversation.id} value={conversation.id}>{conversation.title}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="ai-panel__icon"
          disabled={!ready || state.sending}
          onClick={() => {
            setDraft('')
            void state.createConversation({ mode: 'adviser', title: t('aiApp.newAdviser') })
          }}
          aria-label={t('aiApp.newChat')}
        >
          <Plus className="h-4 w-4" />
        </button>
        {active && (
          <button
            type="button"
            className="ai-panel__icon"
            aria-label={t('aiApp.deleteChat')}
            disabled={state.sending}
            onClick={() => setDeleteTarget(active.id)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <details className="ai-adviser__modes" open={showModes} onToggle={(event) => setShowModes(event.currentTarget.open)}>
        <summary>{t('aiApp.presetLegend')}</summary>
        <AiProviderSelect />
      </details>

      {!available && <p role="status" className="px-4 pt-2 text-sm ai-panel__muted">{t('aiApp.noProvider')}</p>}
      {!allowed && <p role="status" className="px-4 pt-2 text-sm ai-panel__muted">{t('aiApp.noPermission')}</p>}

      <div
        className="ai-adviser__log"
        role="log"
        aria-live="polite"
        aria-busy={state.sending || state.loading}
        aria-label={t('aiApp.messages')}
      >
        {!active && (
          <div className="ai-adviser__empty">
            <MessageSquare className="mx-auto h-7 w-7 ai-panel__muted" />
            <p className="font-display text-xl">{t('aiApp.chatEmpty')}</p>
            <p className="text-sm ai-panel__muted">{t('aiApp.adviserEmptyHint')}</p>
          </div>
        )}
        {active && state.messages.map((message) => (
          <article
            key={message.id}
            className={`ai-adviser__turn ai-adviser__turn--${message.role}`}
          >
            {message.role === 'assistant' && (
              <p className="ai-adviser__who">{t('aiApp.adviser')}</p>
            )}
            <ProtectedAiText canCopy={message.role === 'user' || state.capabilities?.canCopy === true}>
              <p className="ai-adviser__copy">{message.content}</p>
            </ProtectedAiText>
            {message.role === 'assistant' && <AiSources sources={message.sources} />}
          </article>
        ))}
        {(state.sending || state.loading) && (
          <p role="status" className="ai-adviser__status">{t(state.sending ? 'aiApp.thinking' : 'aiApp.loading')}</p>
        )}
        <div ref={endRef} />
      </div>

      <AiError
        error={state.error}
        onRetry={
          active && state.pending[active.id]
            ? () => { void state.retry() }
            : () => { if (active) void state.open(active.id); else void state.loadConversations(projectId) }
        }
      />

      <form className="ai-adviser__compose" onSubmit={onSubmit}>
        <div className="ai-adviser__composer">
          {showDirection && (
            <textarea
              className="ai-panel__control ai-adviser__direction"
              aria-label={t('aiApp.sceneDirection')}
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
              maxLength={2000}
              rows={2}
              placeholder={t('aiApp.sceneDirectionHint')}
              disabled={state.sending}
            />
          )}
          <textarea
            ref={composerRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onComposerKey}
            maxLength={4000}
            rows={2}
            className="ai-adviser__input"
            aria-label={t('aiApp.message')}
            placeholder={t('aiApp.adviserPlaceholder')}
            disabled={!ready || state.sending}
          />
          <div className="ai-adviser__tools">
            <button
              type="button"
              className="ai-panel__chip"
              aria-pressed={webSearch}
              aria-label={t('aiApp.webSearch')}
              title={t('aiApp.webSearchHint')}
              data-testid="web-search-toggle"
              onClick={() => setWebSearch((value) => !value)}
            >
              <Search className="h-3.5 w-3.5" />
              {t('aiApp.webSearch')}
            </button>
            <button
              type="button"
              className="ai-panel__chip"
              aria-pressed={showDirection}
              aria-label={t('aiApp.sceneDirection')}
              title={t('aiApp.sceneDirection')}
              onClick={() => {
                setShowDirection((openDirection) => !openDirection)
                if (showDirection) setDirection('')
              }}
            >
              {t('aiApp.sceneDirectionChip')}
            </button>
            <button
              type="submit"
              className="ai-adviser__send"
              disabled={!ready || !draft.trim() || state.sending}
              aria-label={t('aiApp.send')}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="ai-adviser__legal">
          <AiConsentNote />
          {webSearch && <p>{t('aiApp.webSearchHint')}</p>}
          {!state.capabilities?.canCopy && <p>{t('aiApp.copyPolicy')}</p>}
        </div>
      </form>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('aiApp.deleteChat')}
        message={t('aiApp.deleteChatConfirm')}
        confirmLabel={t('aiApp.deleteChat')}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) void state.remove(deleteTarget); setDeleteTarget(null) }}
      />
    </div>
  )
}
