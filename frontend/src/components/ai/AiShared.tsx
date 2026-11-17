import type { ReactNode, SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAiStore } from '@/stores/ai-store'
import type { AiSource } from '@/types/ai'
import { AiProviderSelect } from './AiPresetPicker'
import './ai.css'

export { AiProviderSelect }

export function AiError({ error, onRetry }: { error: string | null; onRetry?: () => void }) {
  const { t } = useTranslation()
  if (!error) return null
  return <div role="alert" className="ai-panel__error space-y-2"><p>{t(error)}</p>{onRetry && <button type="button" className="ai-panel__button" onClick={onRetry}>{t('aiApp.retry')}</button>}</div>
}

export function AiSources({ sources }: { sources: AiSource[] }) {
  const { t } = useTranslation()
  if (!sources.length) return null
  return <details className="mt-2 text-xs ai-panel__muted"><summary className="cursor-pointer">{t('aiApp.sources', { count: sources.length })}</summary>
    <ul className="mt-1 space-y-1 list-disc pl-4">{sources.map((source) => <li key={source.id}><span className="font-medium">{source.title}</span>{source.excerpt && <blockquote className="mt-1 whitespace-pre-wrap">{source.excerpt}</blockquote>}</li>)}</ul>
  </details>
}

export function ProtectedAiText({ canCopy, children }: { canCopy: boolean; children: ReactNode }) {
  const prevent = (event: SyntheticEvent) => { if (!canCopy) event.preventDefault() }
  return <div className={canCopy ? undefined : 'ai-panel__protected'} onCopy={prevent} onCut={prevent} onDragStart={prevent} draggable={false}>{children}</div>
}

export function AiConsentNote() {
  const { t } = useTranslation()
  const fallback = useAiStore((state) => state.capabilities?.fallbackEnabled)
  return <p className="text-xs ai-panel__muted">{t('aiApp.contextNotice')}{fallback ? ` ${t('aiApp.fallbackNotice')}` : ''}</p>
}
