import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Character } from '@/types/character'

interface FamilyMultiSelectProps {
  id?: string
  options: Character[]
  selected: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
}

export function FamilyMultiSelect({ id, options, selected, onChange, disabled = false }: FamilyMultiSelectProps) {
  const { t } = useTranslation()
  const available = options.filter((o) => !selected.includes(o.id))

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {options.filter((o) => selected.includes(o.id)).map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'var(--color-accent-teal-light)', color: 'var(--color-accent-teal)' }}
            >
              {c.name}
              <button
                type="button"
                onClick={() => onChange(selected.filter((id) => id !== c.id))}
                aria-label={`unlink-${c.name}`}
                disabled={disabled}
                className="hover:opacity-70 disabled:opacity-50"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <select
        id={id}
        value=""
        onChange={(e) => {
          if (e.target.value) onChange([...selected, e.target.value])
        }}
        disabled={disabled}
        className="character-form__control"
      >
        <option value="">{selected.length === 0 ? '—' : `+ ${t('characterApp.addFamilyMember')}`}</option>
        {available.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  )
}
