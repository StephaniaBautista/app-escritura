import { useEffect, type ReactNode } from 'react'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'

interface FormSheetProps {
  isOpen: boolean
  title: string
  closeLabel: string
  confirmLabel: string
  isSaving?: boolean
  onClose: () => void
  onConfirm: () => void
  children: ReactNode
}

export function FormSheet({ isOpen, title, closeLabel, confirmLabel, isSaving = false, onClose, onConfirm, children }: FormSheetProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSaving, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50" onClick={isSaving ? undefined : onClose} />
      <div
        className="relative flex w-full flex-col overflow-hidden shadow-2xl sm:max-w-lg sm:max-h-[92vh] sm:rounded-2xl"
        style={{ background: 'var(--color-paper)' }}
      >
        <header className="flex shrink-0 items-center gap-4 px-4 py-4 text-white" style={{ background: 'var(--color-accent)' }}>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label={closeLabel} className="rounded-full p-1 hover:opacity-70 disabled:opacity-50">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className="font-display text-2xl font-bold leading-none">{title}</h2>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-28 pt-3">{children}</div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={isSaving}
          aria-busy={isSaving}
          aria-label={confirmLabel}
          className="absolute bottom-6 right-5 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-xl transition-transform hover:scale-105 disabled:opacity-60"
          style={{ background: 'var(--color-accent)' }}
        >
          {isSaving ? <Loader2 className="h-7 w-7 animate-spin" /> : <Check className="h-8 w-8" />}
        </button>
      </div>
    </div>
  )
}
