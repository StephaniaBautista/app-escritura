import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import type { Character } from '@/types/character'
import { useCharactersStore } from '@/stores/characters-store'
import { useToastStore } from '@/stores/toast-store'

interface CharacterEvolutionDialogProps {
  character: Character
  onClose: () => void
  onEvolved: (evolved: Character) => void
}

export function CharacterEvolutionDialog({ character, onClose, onEvolved }: CharacterEvolutionDialogProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const { evolve } = useCharactersStore()
  const [name, setName] = useState('')
  const [reason, setReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const changes = name.trim() ? { name: name.trim() } : {}
      const evolved = await evolve(character.id, reason.trim() || t('characterApp.evolve'), changes)
      if (evolved) {
        toast.success(t('characterApp.evolveSuccess'))
        onEvolved(evolved)
        onClose()
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setIsSaving(false)
    }
  }

  const inputStyle = {
    background: 'var(--color-background)',
    borderColor: 'var(--color-paper-lines)',
    color: 'var(--color-ink)',
  } as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl"
        style={{ background: 'var(--color-paper)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
            {t('characterApp.evolveTitle')}
          </h2>
          <button onClick={onClose} aria-label={t('characterApp.cancel')} className="hover:opacity-70">
            <X className="w-5 h-5" style={{ color: 'var(--color-ink-light)' }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>{t('characterApp.evolveHint')}</p>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-light)' }}>
              {t('characterApp.fieldName')} ({character.name})
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('characterApp.evolveNamePlaceholder')}
                className="w-full px-3 py-2 mt-1 text-sm rounded-lg border outline-none focus:ring-2"
                style={inputStyle}
              />
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-light)' }}>
              {t('characterApp.evolveReason')}
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('characterApp.evolveReasonPlaceholder')}
                rows={3}
                className="w-full px-3 py-2 mt-1 text-sm rounded-lg border outline-none focus:ring-2 resize-y"
                style={inputStyle}
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"
            style={{ color: 'var(--color-ink-light)' }}
          >
            {t('characterApp.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            aria-busy={isSaving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--color-accent-violet)' }}
          >
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 data-testid="character-evolve-spinner" className="w-4 h-4 animate-spin" />
                {t('common.saving')}
              </span>
            ) : t('characterApp.evolve')}
          </button>
        </div>
      </div>
    </div>
  )
}
