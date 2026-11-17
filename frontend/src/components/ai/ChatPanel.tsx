import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSquare, Plus, Send, Trash2 } from 'lucide-react'
import { useAiStore } from '@/stores/ai-store'
import { AiConsentNote, AiError, AiProviderSelect, AiSources, ProtectedAiText } from './AiShared'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { AiMode } from '@/types/ai'

interface ChatPanelProps { projectId: string; mode?: AiMode; characterId?: string; chapterId?: string }

export function ChatPanel({ projectId, mode = 'adviser', characterId, chapterId }: ChatPanelProps) {
  const { t, i18n } = useTranslation()
  const state = useAiStore()
  const [draft, setDraft] = useState('')
  const [direction, setDirection] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const context = `${projectId}:${mode}:${characterId ?? ''}:${chapterId ?? ''}`
  const previousContext = useRef(context)
  const sameProject = state.projectId === projectId
  const conversations = sameProject ? state.conversations.filter((conversation) => conversation.mode === mode && (mode === 'adviser' || conversation.characterId === characterId && conversation.chapterId === chapterId)) : []
  const active = conversations.find((conversation) => conversation.id === state.activeId)
  const allowed = sameProject && (mode === 'adviser' ? state.capabilities?.permissions.chat : state.capabilities?.permissions.characters)
  const available = state.capabilities?.providers.some((provider) => provider.available)
  const ready = allowed && available && (mode === 'adviser' || !!characterId && !!chapterId)

  const loadConversations = state.loadConversations
  useEffect(() => { if (allowed) void loadConversations(projectId) }, [projectId, allowed, loadConversations])
  useEffect(() => {
    if (previousContext.current !== context) { previousContext.current = context; setDraft(''); setDirection('') }
  }, [context])
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }) }, [state.messages, state.sending])

  const send = async () => {
    if (!draft.trim() || !active || !ready) return
    const message = draft
    const id = active.id
    const success = await state.send(message, i18n.language.startsWith('en') ? 'en' : 'es', mode === 'adviser' ? direction : undefined)
    if (success && useAiStore.getState().activeId === id) setDraft((current) => current === message ? '' : current)
  }

  if (!allowed) return <p className="text-sm ai-panel__muted">{t('aiApp.noPermission')}</p>

  return <section className="ai-panel flex min-h-0 flex-col gap-4" aria-label={t(mode === 'adviser' ? 'aiApp.chat' : 'aiApp.characterChat')}>
    <div className="flex flex-wrap gap-2 items-end">
      <label className="basis-full min-w-0 text-xs ai-panel__muted space-y-1"><span>{t('aiApp.history')}</span>
        <select className="ai-panel__control" value={active?.id ?? ''} disabled={state.sending} onChange={(event) => { setDraft(''); setDirection(''); void state.open(event.target.value || null) }}>
          <option value="">{t('aiApp.chooseConversation')}</option>
          {conversations.map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.title}</option>)}
        </select>
      </label>
      <button type="button" className="ai-panel__button" disabled={!ready || state.loading || state.sending} onClick={() => { setDraft(''); setDirection(''); void state.createConversation({ mode, ...(mode === 'character' ? { characterId, chapterId } : {}), title: t(mode === 'adviser' ? 'aiApp.newAdviser' : 'aiApp.newCharacter') }) }}><Plus className="h-4 w-4" />{t('aiApp.newChat')}</button>
      {active && <button type="button" className="ai-panel__button" aria-label={t('aiApp.deleteChat')} disabled={state.sending} onClick={() => setDeleteTarget(active.id)}><Trash2 className="h-4 w-4" /></button>}
    </div>
    <AiProviderSelect />
    {!available && <p role="status" className="text-sm ai-panel__muted">{t('aiApp.noProvider')}</p>}
    <div className="min-h-48 max-h-96 flex-1 overflow-y-auto space-y-3" role="log" aria-live="polite" aria-busy={state.sending || state.loading} aria-label={t('aiApp.messages')}>
      {!active && <div className="py-8 space-y-2 ai-panel__muted"><MessageSquare className="h-6 w-6" /><p className="font-display text-lg">{t('aiApp.chatEmpty')}</p><p className="text-sm">{t('aiApp.chatEmptyHint')}</p></div>}
      {active && state.messages.map((message) => <article key={message.id} className={`ai-panel__message ${message.role === 'assistant' ? 'ai-panel__assistant' : ''}`}>
        <p className="text-xs font-semibold mb-1">{t(message.role === 'user' ? 'aiApp.you' : mode === 'character' ? 'aiApp.characterVoice' : 'aiApp.adviser')}</p>
        <ProtectedAiText canCopy={message.role === 'user' || state.capabilities?.canCopy === true}><p className="text-sm whitespace-pre-wrap">{message.content}</p></ProtectedAiText>
        <AiSources sources={message.sources} />
      </article>)}
      {(state.sending || state.loading) && <p role="status" className="text-sm ai-panel__muted">{t(state.sending ? 'aiApp.thinking' : 'aiApp.loading')}</p>}
      <div ref={endRef} />
    </div>
    <AiError error={state.error} onRetry={active && state.pending[active.id] ? () => { void state.retry() } : () => { if (active) void state.open(active.id); else void state.loadConversations(projectId) }} />
    <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); void send() }}>
      <label className="block text-sm font-medium space-y-1"><span>{t('aiApp.message')}</span><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} rows={3} className="ai-panel__control" placeholder={t('aiApp.messagePlaceholder')} disabled={!active || !ready || state.loading} /></label>
      {mode === 'adviser' && <details className="text-sm ai-panel__muted"><summary className="cursor-pointer">{t('aiApp.sceneDirection')}</summary><label className="block mt-2 space-y-1"><span>{t('aiApp.sceneDirectionHint')}</span><textarea className="ai-panel__control" aria-label={t('aiApp.sceneDirection')} value={direction} onChange={(event) => setDirection(event.target.value)} maxLength={2000} rows={2} disabled={!active || state.sending} /></label></details>}
      <div className="flex justify-end"><button type="submit" className="ai-panel__button ai-panel__button--primary" disabled={!active || !ready || !draft.trim() || state.sending || state.loading}><Send className="h-4 w-4" />{t('aiApp.send')}</button></div>
      <AiConsentNote />
      {!state.capabilities?.canCopy && <p className="text-xs ai-panel__muted">{t('aiApp.copyPolicy')}</p>}
    </form>
    <ConfirmDialog isOpen={deleteTarget !== null} title={t('aiApp.deleteChat')} message={t('aiApp.deleteChatConfirm')} confirmLabel={t('aiApp.deleteChat')} onCancel={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) void state.remove(deleteTarget); setDeleteTarget(null) }} />
  </section>
}
