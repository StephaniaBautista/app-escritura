import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Filter, Search, X } from 'lucide-react'
import type { Character } from '@/types/character'
import { HEIGHT_RANGES, type CharacterFiltersState } from '@/lib/character-filters'

function distinctValues(characters: Character[], key: 'role' | 'gender' | 'orientation' | 'maritalStatus' | 'species'): string[] {
  const set = new Set<string>()
  for (const c of characters) {
    const v = c[key]
    if (v) set.add(v)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}

const selectStyle = {
  background: 'var(--color-background)',
  borderColor: 'var(--color-paper-lines)',
  color: 'var(--color-ink)',
} as const

interface CharacterFiltersProps {
  characters: Character[]
  filters: CharacterFiltersState
  onChange: (filters: CharacterFiltersState) => void
}

export function CharacterFilters({ characters, filters, onChange }: CharacterFiltersProps) {
  const { t } = useTranslation()

  const roles = useMemo(() => distinctValues(characters, 'role'), [characters])
  const genders = useMemo(() => distinctValues(characters, 'gender'), [characters])
  const orientations = useMemo(() => distinctValues(characters, 'orientation'), [characters])
  const maritalStatuses = useMemo(() => distinctValues(characters, 'maritalStatus'), [characters])
  const species = useMemo(() => distinctValues(characters, 'species'), [characters])

  const activeCount = Object.values(filters).filter(Boolean).length

  const renderSelect = (label: string, value: string, options: string[], key: keyof CharacterFiltersState) => (
    <label className="block">
      <span className="block text-[11px] font-medium mb-1" style={{ color: 'var(--color-ink-faint)' }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange({ ...filters, [key]: e.target.value })}
        className="w-full px-2 py-1.5 text-xs rounded-lg border outline-none"
        style={selectStyle}
      >
        <option value="">{t('characterApp.all')}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )

  return (
    <div className="notebook-paper p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
          <Filter className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
          {t('characterApp.filters')}
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: 'var(--color-accent)', color: 'white' }}>
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={() => onChange({ query: '', role: '', gender: '', orientation: '', maritalStatus: '', species: '', height: '' })}
            className="flex items-center gap-1 text-xs font-medium hover:opacity-70"
            style={{ color: 'var(--color-ink-faint)' }}
          >
            <X className="w-3 h-3" />
            {t('characterApp.all')}
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-ink-faint)' }} />
        <input
          type="text"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder={t('characterApp.searchPlaceholder')}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none focus:ring-2"
          style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {renderSelect(t('characterApp.roleLabel'), filters.role, roles, 'role')}
        {renderSelect(t('characterApp.fieldGender'), filters.gender, genders, 'gender')}
        {renderSelect(t('characterApp.fieldOrientation'), filters.orientation, orientations, 'orientation')}
        {renderSelect(t('characterApp.fieldMaritalStatus'), filters.maritalStatus, maritalStatuses, 'maritalStatus')}
        {renderSelect(t('characterApp.speciesLabel'), filters.species, species, 'species')}
        <label className="block">
          <span className="block text-[11px] font-medium mb-1" style={{ color: 'var(--color-ink-faint)' }}>
            {t('characterApp.heightRange')}
          </span>
          <select
            value={filters.height}
            onChange={(e) => onChange({ ...filters, height: e.target.value })}
            className="w-full px-2 py-1.5 text-xs rounded-lg border outline-none"
            style={selectStyle}
          >
            <option value="">{t('characterApp.heightAll')}</option>
            {HEIGHT_RANGES.map((r) => (
              <option key={r.id} value={r.id}>{t(`characterApp.height${r.id === 'short' ? 'Short' : r.id === 'medium' ? 'Medium' : r.id === 'tall' ? 'Tall' : 'VeryTall'}`)}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
