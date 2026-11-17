import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useStatsStore } from '@/stores/stats-store'
import { statsRequestQuery } from '@/lib/stats-scope'
import { browserTimeZone } from '@/services/stats'
import type { StatsQuery } from '@/types/stats'
import { ContributionGraph } from './ContributionGraph'
import { MotivationalQuotes } from './MotivationalQuotes'
import { StatsCharts } from './StatsCharts'
import { StatsFilters } from './StatsFilters'
import { localIsoDay, shiftIsoDay } from './stats-calendar'
import './stats.css'

export function StatsDashboard() {
  const userId = useAuthStore((state) => state.user?.id)
  return <StatsDashboardContent key={userId ?? 'anonymous'} userId={userId} />
}

function defaultQuery(): StatsQuery {
  const timeZone = browserTimeZone()
  const to = localIsoDay(timeZone)
  return { period: '30', from: shiftIsoDay(to, -29), to, timeZone }
}

function StatsDashboardContent({ userId }: { userId: string | undefined }) {
  const { t, i18n } = useTranslation()
  const { report, loading, error, load } = useStatsStore()
  const [query, setQuery] = useState<StatsQuery>(defaultQuery)
  useEffect(() => { void load(statsRequestQuery(query)) }, [query, userId, load])
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })
  const date = new Intl.DateTimeFormat(i18n.language, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })
  const metrics = report ? [
    { key: 'currentWords', value: number.format(report.summary.totalWords), hint: 'currentWordsHint' },
    { key: 'wordsAdded', value: number.format(report.summary.wordsAdded), hint: 'periodHint' },
    { key: 'activeTime', value: t('statsApp.duration', { hours: Math.floor(report.summary.activeSeconds / 3600), minutes: Math.floor(report.summary.activeSeconds % 3600 / 60) }), hint: 'activeTimeHint' },
    { key: 'currentStreak', value: t('statsApp.dayCount', { count: report.summary.currentStreak }), hint: 'streakHint' },
    { key: 'todayWords', value: number.format(report.summary.todayWords), hint: 'todayHint' },
    { key: 'dailyAverage', value: number.format(report.summary.dailyAverage), hint: 'averageHint' },
    { key: 'longestStreak', value: t('statsApp.dayCount', { count: report.summary.longestStreak }), hint: 'allTimeHint' },
  ] : []

  return <div className="stats-page p-4 sm:p-6 md:p-8 space-y-6" data-testid="stats-dashboard">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h1 className="font-display text-3xl sm:text-4xl font-bold break-words">{t('statsApp.title')}</h1><p className="stats-muted text-sm mt-1">{t('statsApp.subtitle')}</p></div><button type="button" className="stats-button" disabled={loading} onClick={() => { void load(statsRequestQuery(query)) }}><RefreshCw className="w-4 h-4" />{t('statsApp.refresh')}</button></div>
    <StatsFilters query={query} report={report} onChange={setQuery} />
    {loading && <div role="status" className="notebook-paper p-6 stats-muted" aria-busy="true">{t('statsApp.loading')}</div>}
    {error && <div role="alert" className="notebook-paper p-4 space-y-3"><p>{t(error)}</p><button type="button" className="stats-button" onClick={() => { void load(statsRequestQuery(query)) }}>{t('statsApp.retry')}</button></div>}
    {report && !loading && !error && <>
      <section aria-label={t('statsApp.summary')} className="notebook-paper stats-metrics">
        {metrics.map((metric) => <div key={metric.key} className="stats-metric"><h2 className="text-sm stats-muted">{t(`statsApp.${metric.key}`)}</h2><p className="font-mono text-2xl sm:text-3xl mt-2 break-words" data-metric={metric.key}>{metric.value}</p><p className="text-xs stats-muted mt-1">{t(`statsApp.${metric.hint}`)}</p></div>)}
      </section>
      {report.trackedSince ? <p className="text-sm stats-muted">{t('statsApp.trackedSince', { date: date.format(new Date(report.trackedSince)) })}</p> : null}
      {!report.summary.wordsAdded && !report.summary.activeSeconds && <div role="status" className="notebook-paper p-5"><h2 className="font-display text-xl font-bold">{t('statsApp.emptyTitle')}</h2><p className="text-sm stats-muted mt-1">{t('statsApp.emptyHint')}</p></div>}
      <StatsCharts days={report.days} />
      <div className="notebook-paper p-4 sm:p-6 min-w-0"><ContributionGraph days={report.calendar.days} from={report.calendar.from} to={report.calendar.to} /></div>
      <MotivationalQuotes date={report.today} />
    </>}
  </div>
}
