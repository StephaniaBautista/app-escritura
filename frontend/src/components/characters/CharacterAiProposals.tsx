import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import type { AiCharacterFill } from '@/types/ai'

interface CharacterAiProposalsProps {
  characters: AiCharacterFill[]
  addingAll?: boolean
  onClose: () => void
  onPick: (fill: AiCharacterFill) => void
  onAddAll: (fills: AiCharacterFill[]) => Promise<void> | void
}

export function CharacterAiProposals({ characters, addingAll = false, onClose, onPick, onAddAll }: CharacterAiProposalsProps) {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  const busy = addingAll || pending

  const handleAddAll = async () => {
    if (busy || characters.length === 0) return
    setPending(true)
    try {
      await onAddAll(characters)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="character-ai-proposals-title">
      <button type="button" className="absolute inset-0 cursor-default bg-black/50" onClick={busy ? undefined : onClose} aria-label={t('characterApp.cancel')} />
      <div
        className="relative flex w-full max-w-lg max-h-[88vh] flex-col overflow-hidden rounded-[var(--radius)] border shadow-2xl"
        style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
      >
        <header className="flex items-start justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <div>
            <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--color-ink-faint)' }}>
              {t('characterApp.sheetLabel')}
            </p>
            <h2 id="character-ai-proposals-title" className="font-display text-xl font-bold" style={{ color: 'var(--color-ink)' }}>
              {t('characterApp.aiProposalsTitle')}
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-light)' }}>{t('characterApp.aiProposalsHint')}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label={t('characterApp.cancel')} className="p-1 hover:opacity-70 disabled:opacity-40">
            <X className="h-5 w-5" style={{ color: 'var(--color-ink-light)' }} />
          </button>
        </header>
        <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {characters.map((character, index) => (
            <li key={`${character.name}:${index}`} className="rounded-lg border p-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>{character.name}</p>
                  {character.role ? <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>{character.role}</p> : null}
                  {character.orientation ? <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>{character.orientation}</p> : null}
                  {character.description ? <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-light)' }}>{character.description}</p> : null}
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'var(--color-accent)' }}
                  disabled={busy}
                  onClick={() => onPick(character)}
                >
                  {t('characterApp.aiUseCharacter')}
                </button>
              </div>
            </li>
          ))}
        </ul>
        <footer className="border-t px-4 py-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--color-accent)' }}
            disabled={busy || characters.length === 0}
            aria-busy={busy}
            onClick={() => { void handleAddAll() }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {busy ? t('characterApp.aiAddingAll') : t('characterApp.aiAddAll')}
          </button>
        </footer>
      </div>
    </div>
  )
}
