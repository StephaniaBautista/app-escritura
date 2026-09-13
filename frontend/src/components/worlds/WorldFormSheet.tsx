import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import './world-sheet.css'

interface WorldFormSheetProps {
  eyebrow: string
  title?: string
  variant: 'race' | 'lore' | 'glossary' | 'creature'
  isSaving: boolean
  onClose: () => void
  onSave: () => void
  children: ReactNode
}

export function WorldFormSheet({
  eyebrow,
  title,
  variant,
  isSaving,
  onClose,
  onSave,
  children,
}: WorldFormSheetProps) {
  const { t } = useTranslation()
  const headingId = `world-sheet-title-${variant}`

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isSaving, onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={headingId}>
      <div className="absolute inset-0 bg-black/50" onClick={isSaving ? undefined : onClose} />
      <div
        className={`world-sheet world-sheet--${variant} relative flex w-full max-h-[94vh] flex-col overflow-hidden border shadow-2xl sm:max-w-3xl sm:rounded-[var(--radius)]`}
        style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
      >
        <header className="world-sheet__hero shrink-0">
          <div className="min-w-0">
            <p id={title ? undefined : headingId} className="world-sheet__eyebrow">{eyebrow}</p>
            {title ? <h2 id={headingId} className="world-sheet__title">{title}</h2> : null}
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label={t('common.cancel')} className="world-sheet__close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        <footer className="character-form__footer">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="character-form__button"
            style={{ color: 'var(--color-ink-light)' }}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            aria-busy={isSaving}
            className="character-form__button text-white"
            style={{ background: 'var(--color-accent)' }}
          >
            {isSaving && <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" />}
            {t('common.save')}
          </button>
        </footer>
      </div>
    </div>
  )
}
