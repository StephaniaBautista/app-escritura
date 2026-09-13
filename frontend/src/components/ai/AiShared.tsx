import type { ReactNode, SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAiStore } from '@/stores/ai-store'
import type { AiSource } from '@/types/ai'
import './ai.css'

export function AiError({ error, onRetry }: { error: string | null; onRetry?: () => void }) {
  const { t } = useTranslation()
  if (!error) return null
  return <div role="alert" className="ai-panel__error space-y-2"><p>{t(error)}</p>{onRetry && <button type="button" className="ai-panel__button" onClick={onRetry}>{t('aiApp.retry')}</button>}</div>
}

export function AiProviderSelect() {
  const { t } = useTranslation()
  const { capabilities, provider, setProvider } = useAiStore()
  return <label className="block text-xs ai-panel__muted space-y-1"><span>{t('aiApp.provider')}</span>
    <select className="ai-panel__control" value={provider} onChange={(event) => setProvider(event.target.value)}>
      <option value="">{t('aiApp.providerAuto')}</option>
      {capabilities?.providers.map((item) => <option key={item.id} value={item.id} disabled={!item.available}>{item.id}{item.available ? '' : ` · ${t('aiApp.unavailable')}`}</option>)}
    </select>
  </label>
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
