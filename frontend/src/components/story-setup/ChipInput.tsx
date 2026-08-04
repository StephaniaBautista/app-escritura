import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Plus } from 'lucide-react'

interface ChipInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
  suggestions?: string[]
  max?: number
}

export function ChipInput({ value, onChange, placeholder, suggestions, max }: ChipInputProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')

  const add = (raw: string) => {
    const item = raw.trim()
    if (!item) return
    if (max && value.length >= max) return
    if (value.some((v) => v.toLowerCase() === item.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...value, item])
    setDraft('')
  }

  const remove = (item: string) => onChange(value.filter((v) => v !== item))

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border"
              style={{ borderColor: 'var(--color-accent)', background: 'var(--color-accent-light)', color: 'var(--color-ink)' }}
            >
              {item}
              <button type="button" onClick={() => remove(item)} aria-label={t('common.remove')} className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(draft)
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
        />
        <button
          type="button"
          onClick={() => add(draft)}
          aria-label={t('common.add')}
          className="px-3 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 flex-shrink-0"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestions
            .filter((s) => !value.includes(s))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="px-2 py-1 rounded-full text-xs border hover:opacity-80"
                style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
