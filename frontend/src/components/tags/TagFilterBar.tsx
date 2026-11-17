import { useTranslation } from 'react-i18next'
import type { Tag } from '@/services/tags'

interface TagFilterBarProps {
  tags: Tag[]
  selected: string[]
  onChange: (names: string[]) => void
}

export function TagFilterBar({ tags, selected, onChange }: TagFilterBarProps) {
  const { t } = useTranslation()

  const names = Array.from(new Set(tags.map((tag) => tag.name))).sort((a, b) => a.localeCompare(b))
  if (names.length === 0) return null

  const toggle = (name: string) => {
    onChange(selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name])
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-4">
      <span className="text-xs font-medium mr-1" style={{ color: 'var(--color-ink-light)' }}>
        {t('tagsApp.filterTitle')}
      </span>
      <button
        type="button"
        onClick={() => onChange([])}
        className="px-2 py-1 rounded-full text-xs border transition-colors"
        style={{
          borderColor: selected.length === 0 ? 'var(--color-accent)' : 'var(--color-paper-lines)',
          background: selected.length === 0 ? 'var(--color-accent-light)' : 'transparent',
          color: 'var(--color-ink)',
        }}
      >
        {t('tagsApp.filterAll')}
      </button>
      {names.map((name) => {
        const active = selected.includes(name)
        return (
          <button
            key={name}
            type="button"
            onClick={() => toggle(name)}
            className="px-2 py-1 rounded-full text-xs border transition-colors"
            style={{
              borderColor: active ? 'var(--color-accent)' : 'var(--color-paper-lines)',
              background: active ? 'var(--color-accent-light)' : 'transparent',
              color: 'var(--color-ink)',
            }}
          >
            {name}
          </button>
        )
      })}
    </div>
  )
}
