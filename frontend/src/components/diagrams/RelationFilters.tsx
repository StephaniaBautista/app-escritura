import { useTranslation } from 'react-i18next'
import { RelationshipType, RELATIONSHIP_TYPES } from '@/types/relationship'

interface RelationFiltersProps {
  active: RelationshipType | 'all'
  onChange: (type: RelationshipType | 'all') => void
}

export function RelationFilters({ active, onChange }: RelationFiltersProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium" style={{ color: 'var(--color-ink-faint)' }}>
        {t('diagramApp.filters')}:
      </span>
      {(['all', ...RELATIONSHIP_TYPES] as const).map((type) => {
        const isActive = active === type
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            aria-pressed={isActive}
            className="rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors"
            style={{
              borderColor: isActive ? 'var(--color-accent-violet)' : 'var(--color-paper-lines)',
              background: isActive ? 'var(--color-accent-violet-light)' : 'var(--color-background)',
              color: isActive ? 'var(--color-accent-violet)' : 'var(--color-ink-light)',
            }}
          >
            {type === 'all' ? t('diagramApp.allTypes') : t(`diagramApp.type_${type}`)}
          </button>
        )
      })}
    </div>
  )
}
