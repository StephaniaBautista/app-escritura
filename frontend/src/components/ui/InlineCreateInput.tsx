import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface InlineCreateInputProps {
  placeholder: string
  onSubmit: (value: string) => Promise<void>
  onCancel: () => void
}

export function InlineCreateInput({ placeholder, onSubmit, onCancel }: InlineCreateInputProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (submitting || !value.trim()) return
    setSubmitting(true)
    try {
      await onSubmit(value.trim())
      setValue('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape' && !submitting) {
      setValue('')
      onCancel()
    }
  }

  return (
    <div className="mb-4 notebook-paper p-4">
      <div className="relative">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={submitting}
          aria-busy={submitting}
          className="w-full px-3 py-2 text-sm rounded-lg border disabled:opacity-60"
          style={{
            background: 'var(--color-background)',
            borderColor: 'var(--color-paper-lines)',
            color: 'var(--color-ink)',
          }}
          onBlur={() => { if (!submitting && !value.trim()) onCancel() }}
        />
        {submitting && (
          <Loader2
            className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
            style={{ color: 'var(--color-ink-faint)' }}
            aria-label={t('common.loading')}
          />
        )}
      </div>
    </div>
  )
}
