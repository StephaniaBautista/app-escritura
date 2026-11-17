import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, MoreVertical, Plus, Send, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { useAiStore } from '@/stores/ai-store'
import { useAiCapabilities } from './useAiCapabilities'
import { AiConsentNote, AiError, AiProviderSelect, AiSources, ProtectedAiText } from './AiShared'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { knowledgeScopes } from './knowledge-scopes'
import { roleplaySegments } from './roleplay-text'
import type { Character } from '@/types/character'
import './character-chat.css'

function RoleplayText({ content }: { content: string }) {
  return (
    <>
      {roleplaySegments(content).map((segment, index) => segment.beat
        ? <em key={index} className="ai-character__beat">{segment.text}</em>
        : <span key={index}>{segment.text}</span>)}
    </>
  )
}

interface CharacterChatProps {
  projectId: string
  character: Character
  scopeId: string
  onSelectScope: (scopeId: string) => void
  onBack: () => void
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

export function CharacterChat({ projectId, character, scopeId, onSelectScope, onBack }: CharacterChatProps) {
  const { t, i18n } = useTranslation()
  const state = useAiStore()
  const { capabilities, loading: capabilitiesLoading, error: capabilitiesError, retry: retryCapabilities } = useAiCapabilities(projectId)
  const [draft, setDraft] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const sendingRef = useRef(false)

  const scopes = useMemo(() => knowledgeScopes(capabilities?.pages ?? []), [capabilities])
  const scope = scopes.find((item) => item.id === scopeId) ?? scopes[scopes.length - 1]
  const scopeTitle = scope?.title ?? ''
  const validScopeId = scope?.id ?? ''
  const allowed = capabilities?.permissions.characters === true && state.projectId === projectId
  const available = capabilities?.providers.some((provider) => provider.available) === true
  const ready = allowed && available && Boolean(validScopeId)
  const conversations = state.projectId === projectId
    ? state.conversations.filter((item) => item.mode === 'character' && item.characterId === character.id && item.chapterId === validScopeId)
    : []
  const active = conversations.find((item) => item.id === state.activeId)
  const thread = active ? state.messages : []

  const loadConversations = state.loadConversations
  useEffect(() => { if (allowed) void loadConversations(projectId) }, [projectId, allowed, loadConversations])
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'nearest' }) }, [state.messages, state.sending])

  const openers = [
    t('aiApp.openerScene'),
    t('aiApp.openerMotive'),
    t('aiApp.openerConflict'),
  ]

  const conversationTitle = () => `${character.name} · ${new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date())}`

  const send = async () => {
    if (!draft.trim() || !ready || sendingRef.current || state.sending) return
    sendingRef.current = true
    const message = draft
    try {
      let id = useAiStore.getState().activeId
      const current = useAiStore.getState().conversations.find((item) =>
        item.id === id && item.characterId === character.id && item.chapterId === validScopeId)
      if (!current) {
        id = await state.createConversation({
          mode: 'character', characterId: character.id, chapterId: validScopeId, title: conversationTitle(),
        })
        if (!id) return
      }
      const success = await state.send(message, i18n.language.startsWith('en') ? 'en' : 'es')
      if (success) setDraft((currentDraft) => (currentDraft === message ? '' : currentDraft))
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

  const startFresh = async () => {
    setDraft('')
    setMenuOpen(false)
    await state.createConversation({
      mode: 'character', characterId: character.id, chapterId: validScopeId, title: conversationTitle(),
    })
  }

  return (
    <section className="ai-character" aria-label={character.name}>
      <header className="ai-character__head">
        <button type="button" className="ai-panel__icon" onClick={onBack} aria-label={t('aiApp.backToCharacters')}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        {character.imageUrl ? (
          <img src={character.imageUrl} alt="" className="ai-character__avatar" />
        ) : (
          <span className="ai-character__avatar ai-character__avatar--fallback" aria-hidden="true">
            {initials(character.name)}
          </span>
        )}
        <div className="ai-character__identity">
          <h2 className="ai-character__name">{character.name}</h2>
          {character.role && <p className="ai-character__role">{character.role}</p>}
        </div>
        <details
          className="ai-character__menu"
          open={menuOpen}
          onToggle={(event) => setMenuOpen(event.currentTarget.open)}
        >
          <summary aria-label={t('aiApp.characterMenu')} title={t('aiApp.characterMenu')}>
            <MoreVertical className="h-4 w-4" aria-hidden="true" />
          </summary>
          <div className="ai-character__menu-panel">
            <p className="ai-character__menu-label">{t('aiApp.history')}</p>
            {conversations.length === 0 && <p className="ai-character__menu-empty">{t('aiApp.historyEmpty')}</p>}
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                className="ai-character__menu-item"
                aria-current={conversation.id === active?.id}
                onClick={() => { setMenuOpen(false); void state.open(conversation.id) }}
              >
                <span className="truncate">{conversation.title}</span>
              </button>
            ))}
            <button
              type="button"
              className="ai-character__menu-item"
              disabled={!ready || state.sending}
              onClick={() => void startFresh()}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {t('aiApp.newChat')}
            </button>
            {active && (
              <button
                type="button"
                className="ai-character__menu-item ai-character__menu-item--danger"
                disabled={state.sending}
                onClick={() => { setMenuOpen(false); setDeleteTarget(active.id) }}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                {t('aiApp.deleteChat')}
              </button>
            )}
          </div>
        </details>
      </header>

      {capabilitiesError && <AiError error={capabilitiesError} onRetry={() => void retryCapabilities()} />}

      {capabilitiesLoading && !capabilities && (
        <p role="status" className="ai-character__notice">{t('aiApp.loading')}</p>
      )}

      {capabilities && scopes.length === 0 && (
        <p className="ai-character__notice">
          {t('characterApp.noManuscript')}
          <Link to={`/app/documents/${projectId}?tab=documents`} className="ai-panel__link">
            {t('characterApp.noManuscriptLink')}
          </Link>
        </p>
      )}

      {scopes.length > 0 && (
        <div className="ai-character__scope">
          <div className="ai-character__scope-row">
            <label className="ai-character__scope-label" htmlFor="character-scope">{t('aiApp.knowledgeScope')}</label>
            <select
              id="character-scope"
              className="ai-panel__control"
              value={validScopeId}
              disabled={state.sending}
              onChange={(event) => onSelectScope(event.target.value)}
            >
              {scopes.map((item) => (
                <option key={item.id} value={item.id}>
                  {`${'\u00A0'.repeat(item.depth * 2)}${t(item.type === 'chapter' ? 'aiApp.scopeChapter' : 'aiApp.scopeSubpage')} · ${item.title}`}
                </option>
              ))}
            </select>
          </div>
          <p className="ai-character__scope-hint">{t('aiApp.knowledgeScopeHint')}</p>
        </div>
      )}

      {capabilities && !allowed && <p role="status" className="ai-character__notice">{t('aiApp.noPermission')}</p>}
      {capabilities && allowed && !available && <p role="status" className="ai-character__notice">{t('aiApp.noProvider')}</p>}

      <div className="ai-character__log" role="log" aria-live="polite" aria-busy={state.sending || state.loading} aria-label={t('aiApp.messages')}>
        {thread.length === 0 && !state.loading && (
          <div className="ai-character__empty">
            {character.imageUrl ? (
              <img src={character.imageUrl} alt="" className="ai-character__avatar" />
            ) : (
              <span className="ai-character__avatar ai-character__avatar--fallback" aria-hidden="true">
                {initials(character.name)}
              </span>
            )}
            <p className="ai-character__empty-title">{t('aiApp.characterIntro', { name: character.name })}</p>
            {scopeTitle && <p className="ai-character__empty-hint">{t('aiApp.characterIntroHint', { scope: scopeTitle })}</p>}
            <div className="ai-character__openers">
              <p className="ai-character__openers-label">{t('aiApp.openersLabel')}</p>
              <div className="ai-character__opener-list">
                {openers.map((opener) => (
                  <button
                    key={opener}
                    type="button"
                    className="ai-panel__chip"
                    disabled={!ready || state.sending}
                    onClick={() => { setDraft(opener); composerRef.current?.focus() }}
                  >
                    {opener}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {thread.map((message) => (
          <article key={message.id} className={`ai-character__turn ai-character__turn--${message.role}`}>
            {message.role === 'assistant' && (
              character.imageUrl ? (
                <img src={character.imageUrl} alt="" className="ai-character__avatar ai-character__avatar--small" />
              ) : (
                <span className="ai-character__avatar ai-character__avatar--fallback ai-character__avatar--small" aria-hidden="true">
                  {initials(character.name)}
                </span>
              )
            )}
            <div className={`ai-character__bubble ai-character__bubble--${message.role === 'user' ? 'user' : 'character'}`}>
              {message.role === 'assistant' && <p className="ai-character__who">{character.name}</p>}
              <ProtectedAiText canCopy={message.role === 'user' || state.capabilities?.canCopy === true}>
                <p className="ai-character__copy"><RoleplayText content={message.content} /></p>
              </ProtectedAiText>
              {message.role === 'assistant' && <AiSources sources={message.sources} />}
            </div>
          </article>
        ))}

        {(state.sending || state.loading) && (
          <p role="status" className="ai-character__status">{t(state.sending ? 'aiApp.thinking' : 'aiApp.loading')}</p>
        )}
        <div ref={endRef} />
      </div>

      <AiError
        error={state.error}
        onRetry={
          active && state.pending[active.id]
            ? () => { void state.retry() }
            : () => { if (active) void state.open(active.id); else void loadConversations(projectId) }
        }
      />

      <form
        className="ai-character__compose"
        onSubmit={(event) => { event.preventDefault(); void send() }}
      >
        <div className="ai-character__composer">
          <textarea
            ref={composerRef}
            className="ai-character__input"
            rows={2}
            maxLength={4000}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onComposerKey}
            aria-label={t('aiApp.message')}
            placeholder={t('aiApp.characterPlaceholder', { name: character.name })}
            disabled={!ready || state.sending}
          />
          <div className="ai-character__tools">
            <button
              type="submit"
              className="ai-character__send"
              disabled={!ready || !draft.trim() || state.sending}
              aria-label={t('aiApp.send')}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <details className="ai-character__settings">
          <summary>{t('aiApp.presetLegend')}</summary>
          <AiProviderSelect />
        </details>
        <div className="ai-character__legal">
          <AiConsentNote />
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
    </section>
  )
}
