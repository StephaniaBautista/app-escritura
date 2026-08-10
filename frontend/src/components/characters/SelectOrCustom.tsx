import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectOrCustomProps {
  value: string | null
  options: SelectOption[]
  onChange: (value: string | null) => void
  id?: string
}

export function SelectOrCustom({ value, options, onChange, id }: SelectOrCustomProps) {
  const { t } = useTranslation()
  const [showInput, setShowInput] = useState(false)
  const [draft, setDraft] = useState('')
  const [customOptions, setCustomOptions] = useState<string[]>(() =>
    value !== null && !options.some((o) => o.value === value) ? [value] : [],
  )

  const addCustom = () => {
    const label = draft.trim()
    if (!label) return
    const existing = options.find((o) => o.label.toLowerCase() === label.toLowerCase())
    if (existing) {
      onChange(existing.value)
    } else {
      onChange(label)
      setCustomOptions((prev) => (prev.includes(label) ? prev : [...prev, label]))
    }
    setDraft('')
    setShowInput(false)
  }

  const customValues = customOptions.filter((c) => !options.some((o) => o.value === c))

  return (
    <div>
      <div className="flex gap-2">
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
          className="character-form__control min-w-0 flex-1"
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
          {customValues.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowInput((s) => !s)}
          aria-label={t('characterApp.customOption')}
          className="character-form__add-button"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {showInput && (
        <div className="mt-2 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCustom()
              }
            }}
            placeholder={t('characterApp.customAddPlaceholder')}
            autoFocus
            className="character-form__control"
          />
          <button
            type="button"
            onClick={addCustom}
            aria-label={t('characterApp.customAddConfirm')}
            className="character-form__button text-white"
            style={{ background: 'var(--color-accent)' }}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowInput(false)
              setDraft('')
            }}
            aria-label={t('characterApp.customCancel')}
            className="character-form__button"
            style={{ color: 'var(--color-ink-light)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
