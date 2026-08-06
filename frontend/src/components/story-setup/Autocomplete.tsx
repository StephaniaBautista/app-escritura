import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X, Check } from 'lucide-react'
import { useOptionsStore } from '@/stores/options-store'
import type { OptionType } from '@/types/story'
import { cn } from '@/lib/utils'

interface AutocompleteProps {
  value: string[]
  onChange: (value: string[]) => void
  optionType?: OptionType
  placeholder?: string
  id?: string
  hideChips?: boolean
}

const MAX_SUGGESTIONS = 8

export function Autocomplete({
  value,
  onChange,
  optionType,
  placeholder,
  id,
  hideChips = false,
}: AutocompleteProps) {
  const { t } = useTranslation()
  const storeOptions = useOptionsStore((s) => (optionType ? s.options[optionType] : undefined))
  const loadOptions = useOptionsStore((s) => s.loadOptions)
  const addStoreOption = useOptionsStore((s) => s.addOption)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [creating, setCreating] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const justSelectedRef = useRef(false)

  useEffect(() => {
    if (optionType && !storeOptions) {
      loadOptions(optionType)
    }
  }, [optionType, storeOptions, loadOptions])

  const allOptions = storeOptions?.map((o) => ({ value: o.value, label: o.label })) ?? []
  const trimmed = query.trim()

  const suggestions = allOptions
    .filter((o) => !value.includes(o.value))
    .filter((o) => !trimmed || o.label.toLowerCase().includes(trimmed.toLowerCase()))
    .slice(0, MAX_SUGGESTIONS)

  const exactMatch = allOptions.find((o) => o.label.toLowerCase() === trimmed.toLowerCase())

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const selectValue = (optValue: string) => {
    if (!value.includes(optValue)) {
      onChange([...value, optValue])
    }
    setQuery('')
    setOpen(false)
    setActive(-1)
  }

  const createOption = async (raw: string) => {
    const label = raw.trim()
    if (!label) return
    const existing = allOptions.find((o) => o.label.toLowerCase() === label.toLowerCase())
    if (existing) {
      selectValue(existing.value)
      return
    }
    if (optionType) {
      const option = await addStoreOption(optionType, label, label)
      selectValue(option.value)
    } else {
      selectValue(label)
    }
  }

  const handleBlur = () => {
    if (creating || justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }
    if (trimmed && !exactMatch) {
      setCreating(true)
      createOption(trimmed)
        .catch(() => {})
        .finally(() => setCreating(false))
    } else {
      setQuery('')
      setOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      setActive((a) => (suggestions.length === 0 ? -1 : Math.min(a + 1, suggestions.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      justSelectedRef.current = true
      if (active >= 0 && suggestions[active]) {
        selectValue(suggestions[active].value)
      } else {
        setCreating(true)
        createOption(trimmed)
          .catch(() => {})
          .finally(() => setCreating(false))
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  const remove = (item: string) => onChange(value.filter((v) => v !== item))

  return (
    <div ref={rootRef} className="relative">
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
        <input
          id={id}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
        />
        {optionType && (
          <button
            type="button"
            onClick={() => {
              if (trimmed) {
                justSelectedRef.current = true
                createOption(trimmed).catch(() => {})
              }
            }}
            aria-label={t('common.add')}
            className="px-3 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 flex-shrink-0"
            style={{ background: 'var(--color-accent)' }}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div
          className="absolute z-30 mt-1 w-full py-1 rounded-lg shadow-xl max-h-60 overflow-y-auto"
          style={{ background: 'var(--color-paper)', border: '1px solid var(--color-paper-lines)' }}
        >
          {suggestions.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                justSelectedRef.current = true
                selectValue(opt.value)
              }}
              onMouseEnter={() => setActive(idx)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:opacity-80 transition-opacity"
              style={{
                background: idx === active ? 'var(--color-accent-light)' : 'transparent',
                color: 'var(--color-ink)',
              }}
            >
              {value.includes(opt.value) && <Check className="w-3.5 h-3.5" />}
              <span className={cn('truncate', value.includes(opt.value) && 'line-through opacity-50')}>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
