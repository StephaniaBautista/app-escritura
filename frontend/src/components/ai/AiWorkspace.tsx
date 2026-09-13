import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, MessageSquare, UserRound, SearchCheck } from 'lucide-react'
import { useAiCapabilities } from './useAiCapabilities'
import { AiError } from './AiShared'
import { ChatPanel } from './ChatPanel'
import { CharacterChat } from './CharacterChat'
import { SuggestionsPanel } from './SuggestionsPanel'
import type { AiSuggestion } from '@/types/ai'

interface AiWorkspaceProps {
  projectId: string
  documentId?: string
  draftContent?: string
  onClose?: () => void
  onSuggestionsChange?: (suggestions: AiSuggestion[]) => void
  onReveal?: (suggestion: AiSuggestion) => void
}

export function AiWorkspace({ projectId, documentId, draftContent, onClose, onSuggestionsChange, onReveal }: AiWorkspaceProps) {
  const { t } = useTranslation()
  const { capabilities, loading, error, retry } = useAiCapabilities(projectId)
  const [tab, setTab] = useState('chat')
  const tabs = [
    { id: 'chat', label: 'aiApp.chat', icon: MessageSquare, allowed: capabilities?.permissions.chat },
    { id: 'characters', label: 'aiApp.characterChat', icon: UserRound, allowed: capabilities?.permissions.characters },
    { id: 'suggestions', label: 'aiApp.suggestions', icon: SearchCheck, allowed: capabilities?.permissions.suggestions },
  ].filter((item) => item.allowed)
  const selected = tabs.some((item) => item.id === tab) ? tab : tabs[0]?.id

  return <div className="ai-panel notebook-paper p-4 sm:p-5 space-y-4" data-testid="ai-workspace">
    <div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-2xl font-bold">{t('aiApp.title')}</h2><p className="text-sm ai-panel__muted">{t('aiApp.subtitle')}</p></div>{onClose && <button type="button" className="ai-panel__button" onClick={onClose} aria-label={t('aiApp.close')}><X className="h-4 w-4" /></button>}</div>
    {loading && <p role="status" className="text-sm ai-panel__muted">{t('aiApp.loading')}</p>}
    <AiError error={error} onRetry={() => { void retry() }} />
    {!loading && capabilities && !tabs.length && <p className="text-sm ai-panel__muted">{t('aiApp.noPermission')}</p>}
    {!!tabs.length && <div className="flex flex-wrap gap-2" role="group" aria-label={t('aiApp.tools')}>
      {tabs.map((item) => <button type="button" key={item.id} className="ai-panel__button" aria-pressed={selected === item.id} onClick={() => setTab(item.id)}><item.icon className="h-4 w-4" />{t(item.label)}</button>)}
    </div>}
    {selected === 'chat' && <ChatPanel projectId={projectId} />}
    {selected === 'characters' && <CharacterChat key={projectId} projectId={projectId} />}
    {selected === 'suggestions' && <SuggestionsPanel key={`${projectId}:${documentId ?? ''}`} projectId={projectId} documentId={documentId} draftContent={draftContent} onSuggestionsChange={onSuggestionsChange} onReveal={onReveal} />}
  </div>
}
