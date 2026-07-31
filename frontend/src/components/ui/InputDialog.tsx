import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface InputDialogProps {
  isOpen: boolean
  title: string
  placeholder?: string
  confirmLabel?: string
  onSubmit: (value: string) => void
  onCancel: () => void
}

export function InputDialog({ isOpen, title, placeholder, confirmLabel, onSubmit, onCancel }: InputDialogProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setValue('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const handleSubmit = () => {
    if (value.trim()) onSubmit(value.trim())
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative notebook-paper p-6 max-w-sm w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-bold mb-4" style={{ color: 'var(--color-ink)' }}>
          {title}
        </h3>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-lg text-sm border mb-4"
          style={{
            background: 'var(--color-background)',
            borderColor: 'var(--color-paper-lines)',
            color: 'var(--color-ink)',
          }}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-80"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}
          >
            {confirmLabel || t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
