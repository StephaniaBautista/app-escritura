import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Character } from '@/types/character'

interface FamilyMultiSelectProps {
  id?: string
  options: Character[]
  selected: string[]
  onChange: (value: string[]) => void
}

export function FamilyMultiSelect({ id, options, selected, onChange }: FamilyMultiSelectProps) {
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
                className="hover:opacity-70"
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
        className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2"
        style={{
          background: 'var(--color-background)',
          borderColor: 'var(--color-paper-lines)',
          color: 'var(--color-ink)',
        }}
      >
        <option value="">{selected.length === 0 ? '—' : `+ ${t('characterApp.addFamilyMember')}`}</option>
        {available.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  )
}
