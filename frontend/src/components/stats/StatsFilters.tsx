import { ChevronDown } from 'lucide-react'
import type { ChangeEventHandler, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { StatsPeriod, StatsQuery, WritingStats } from '@/types/stats'
import { changeStatsPeriod, changeStatsRange, changeStatsScope, childDocuments, rootDocuments } from '@/lib/stats-scope'

interface StatsFiltersProps { query: StatsQuery; report: WritingStats | null; onChange: (query: StatsQuery) => void }

const PERIODS: StatsPeriod[] = ['all', '7', '30', '60', '90', 'custom']

export function StatsFilters({ query, report, onChange }: StatsFiltersProps) {
  const { t } = useTranslation()
  const today = report?.today ?? query.to
  const documents = query.projectId ? rootDocuments(report?.documents ?? [], query.projectId) : []
  const subpages = query.documentId ? childDocuments(report?.documents ?? [], query.documentId) : []
  return <form className="stats-filters notebook-paper" onSubmit={(event) => event.preventDefault()}>
    <div>
      <p id="stats-period-label" className="stats-filters-label">{t('statsApp.period')}</p>
      <div role="radiogroup" aria-labelledby="stats-period-label" className="stats-period">
        {PERIODS.map((period) => {
          const label = period === 'all' ? t('statsApp.periodAll') : period === 'custom' ? t('statsApp.periodCustom') : t('statsApp.lastDays', { count: Number(period) })
          return <label key={period} className="stats-period-chip">
            <input type="radio" name="stats-period" value={period} checked={query.period === period} onChange={() => onChange(changeStatsPeriod(query, period, today))} />
            <span>{label}</span>
          </label>
        })}
      </div>
    </div>
    {query.period === 'custom' ? <div className="stats-dates">
      <FilterField label={t('statsApp.rangeFrom')}>
        <input className="stats-control" type="date" max={query.to} value={query.from} onChange={(event) => onChange(changeStatsRange(query, 'from', event.target.value))} />
      </FilterField>
      <FilterField label={t('statsApp.rangeTo')}>
        <input className="stats-control" type="date" min={query.from} max={today} value={query.to} onChange={(event) => onChange(changeStatsRange(query, 'to', event.target.value))} />
      </FilterField>
    </div> : null}
    <div className="stats-scope">
      <FilterSelect label={t('statsApp.folder')} value={query.projectId ?? ''} onChange={(event) => onChange(changeStatsScope(query, 'projectId', event.target.value))}>
        <option value="">{t('statsApp.allFolders')}</option>
        {report?.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </FilterSelect>
      {query.projectId ? <FilterSelect label={t('statsApp.document')} value={query.documentId ?? ''} onChange={(event) => onChange(changeStatsScope(query, 'documentId', event.target.value))}>
        <option value="">{t('statsApp.allDocuments')}</option>
        {documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}
      </FilterSelect> : null}
      {query.documentId ? <FilterSelect label={t('statsApp.subpage')} value={query.subpageId ?? ''} onChange={(event) => onChange(changeStatsScope(query, 'subpageId', event.target.value))}>
        <option value="">{t('statsApp.allSubpages')}</option>
        {subpages.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}
      </FilterSelect> : null}
    </div>
  </form>
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="stats-filter-field"><span className="stats-filters-label">{label}</span>{children}</label>
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: ChangeEventHandler<HTMLSelectElement>; children: ReactNode }) {
  return <FilterField label={label}>
    <span className="stats-select-wrap">
      <select className="stats-control" value={value} onChange={onChange}>{children}</select>
      <ChevronDown className="stats-select-icon" aria-hidden />
    </span>
  </FilterField>
}
