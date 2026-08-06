import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X } from 'lucide-react'
import { useOptionsStore } from '@/stores/options-store'
import type { OptionType } from '@/types/story'

interface MultiSelectProps {
  options?: { value: string; label: string }[]
  value: string[]
  onChange: (value: string[]) => void
  id?: string
  placeholder?: string
  optionType?: OptionType
  hideChips?: boolean
}

export function MultiSelect({
  options: staticOptions,
  value,
  onChange,
  id,
  placeholder,
  optionType,
  hideChips = false,
}: MultiSelectProps) {
  const { t } = useTranslation()
  const storeOptions = useOptionsStore((s) => (optionType ? s.options[optionType] : undefined))
  const loadOptions = useOptionsStore((s) => s.loadOptions)
  const addStoreOption = useOptionsStore((s) => s.addOption)
  const [showInput, setShowInput] = useState(false)
  const [draft, setDraft] = useState('')
  const [selected, setSelected] = useState('')

  useEffect(() => {
    if (optionType && !storeOptions) {
      loadOptions(optionType)
    }
  }, [optionType, storeOptions, loadOptions])

  const dbOptions = storeOptions?.map((o) => ({ value: o.value, label: o.label })) ?? []
  const allOptions = staticOptions
    ? [...staticOptions, ...dbOptions.filter((d) => !staticOptions.some((s) => s.value === d.value))]
    : dbOptions

  const addFromSelect = (val: string) => {
    if (val && !value.includes(val)) {
      onChange([...value, val])
    }
    setSelected('')
  }

  const remove = (item: string) => onChange(value.filter((v) => v !== item))

  const addCustom = async () => {
    const label = draft.trim()
    if (!label) return
    const existing = allOptions.find((o) => o.label.toLowerCase() === label.toLowerCase())
    if (existing) {
      if (!value.includes(existing.value)) {
        onChange([...value, existing.value])
      }
    } else if (optionType) {
      const option = await addStoreOption(optionType, label, label)
      onChange([...value, option.value])
    } else {
      onChange([...value, label])
    }
    setDraft('')
    setShowInput(false)
  }

  const allowCustom = optionType !== undefined

  return (
    <div>
      {!hideChips && value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((item) => {
            const opt = allOptions.find((o) => o.value === item)
            return (
              <span
                key={item}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border"
                style={{ borderColor: 'var(--color-accent)', background: 'var(--color-accent-light)', color: 'var(--color-ink)' }}
              >
                {opt?.label ?? item}
                <button type="button" onClick={() => remove(item)} aria-label={t('common.remove')} className="hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}
      <div className="flex gap-2">
        <select
          id={id}
          value={selected}
          onChange={(e) => addFromSelect(e.target.value)}
          className="flex-1 rounded-lg border px-3 py-2 text-sm appearance-none cursor-pointer"
          style={{
            background: 'var(--color-background)',
            borderColor: 'var(--color-paper-lines)',
            color: selected ? 'var(--color-ink)' : 'var(--color-ink-faint)',
          }}
        >
          <option value="" disabled hidden>
            {placeholder ?? t('common.select')}
          </option>
          {allOptions.map((opt) => {
            const isSelected = value.includes(opt.value)
            return (
              <option key={opt.value} value={opt.value} disabled={isSelected}>
                {isSelected ? `✓ ${opt.label}` : opt.label}
              </option>
            )
          })}
        </select>
        {allowCustom && (
          <button
            type="button"
            onClick={() => setShowInput((s) => !s)}
            className="px-3 py-2 rounded-lg border text-sm hover:opacity-80 flex-shrink-0"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}
            aria-label={t('storySetup.addCustom')}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      {showInput && (
        <div className="flex gap-2 mt-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCustom()
              }
            }}
            placeholder={t('storySetup.addCustomPlaceholder')}
            autoFocus
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
          />
          <button
            type="button"
            onClick={addCustom}
            className="px-3 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 flex-shrink-0"
            style={{ background: 'var(--color-accent)' }}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowInput(false)
              setDraft('')
            }}
            className="px-2 py-2 rounded-lg border hover:opacity-80 flex-shrink-0"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
