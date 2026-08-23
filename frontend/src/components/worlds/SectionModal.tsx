import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'

interface SectionModalProps {
  title: string
  isSaving: boolean
  onClose: () => void
  onSave: () => void
  children: ReactNode
}

export function SectionModal({ title, isSaving, onClose, onSave, children }: SectionModalProps) {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={isSaving ? undefined : onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>{title}</h2>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label={t('common.cancel')} className="hover:opacity-70 disabled:opacity-50">
            <X className="h-5 w-5" style={{ color: 'var(--color-ink-light)' }} />
          </button>
        </div>

        <div className="space-y-4 p-5">{children}</div>

        <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ color: 'var(--color-ink-light)' }}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            aria-busy={isSaving}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: 'var(--color-accent)' }}
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
