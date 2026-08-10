import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  loading?: boolean
  children?: React.ReactNode
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  loading = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    confirmRef.current?.focus()

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel, loading])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={loading ? undefined : onCancel}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative notebook-paper p-6 max-w-sm w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          {variant === 'danger' && (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-accent-light)' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
            </div>
          )}
          <div>
            <h3 className="font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
              {title}
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--color-ink-light)' }}>
              {message}
            </p>
          </div>
        </div>
        {children}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: variant === 'danger' ? 'var(--color-accent)' : 'var(--color-accent)' }}
          >
            {loading ? (
              <Loader2 data-testid="confirm-loading-spinner" className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              confirmLabel || t('common.confirm')
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
