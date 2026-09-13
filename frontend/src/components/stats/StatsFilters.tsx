import { useTranslation } from 'react-i18next'
import type { StatsQuery, WritingStats } from '@/types/stats'

interface StatsFiltersProps { query: StatsQuery; report: WritingStats | null; onChange: (query: StatsQuery) => void }

export function StatsFilters({ query, report, onChange }: StatsFiltersProps) {
  const { t } = useTranslation()
  const documents = report?.documents.filter((document) => !query.projectId || document.projectId === query.projectId) ?? []
  return <div className="space-y-2">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <label className="block text-sm space-y-1"><span>{t('statsApp.period')}</span><select className="stats-control" value={query.days} onChange={(event) => onChange({ ...query, days: Number(event.target.value) as StatsQuery['days'] })}>{[30, 90, 365].map((days) => <option key={days} value={days}>{t('statsApp.lastDays', { count: days })}</option>)}</select></label>
      <label className="block text-sm space-y-1"><span>{t('statsApp.project')}</span><select className="stats-control" value={query.projectId ?? ''} onChange={(event) => onChange({ days: query.days, timeZone: query.timeZone, ...(event.target.value ? { projectId: event.target.value } : {}) })}><option value="">{t('statsApp.allProjects')}</option>{report?.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <label className="block text-sm space-y-1"><span>{t('statsApp.document')}</span><select className="stats-control" value={query.documentId ?? ''} onChange={(event) => onChange({ ...query, documentId: event.target.value || undefined })}><option value="">{t('statsApp.allDocuments')}</option>{documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}</select></label>
    </div>
    <p className="text-xs stats-muted">{t('statsApp.documentScope')}</p>
  </div>
}
