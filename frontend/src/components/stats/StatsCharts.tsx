import { useTranslation } from 'react-i18next'
import type { StatsDay } from '@/types/stats'
import { chartAreaPath, chartPolyline } from '@/lib/stats-chart'
import { calendarDate } from './stats-calendar'

function Chart({ title, values, days, unit }: { title: string; values: number[]; days: StatsDay[]; unit: string }) {
  const { t, i18n } = useTranslation()
  const date = new Intl.DateTimeFormat(i18n.language, { timeZone: 'UTC', day: 'numeric', month: 'short' })
  const peak = Math.max(...values, 0)
  const first = days[0]
  const last = days[days.length - 1]
  return <figure className="stats-chart-card space-y-3 min-w-0">
    <figcaption className="font-medium">{title}</figcaption>
    <svg className="stats-chart-svg" viewBox="0 0 320 120" role="img" aria-label={`${title}: ${peak} ${unit}`}>
      <path className="stats-chart-fill" d={chartAreaPath(values, 320, 120)} />
      <polyline className="stats-chart-line" points={chartPolyline(values, 320, 120)} />
    </svg>
    {first && last ? <p className="text-xs stats-muted">{date.format(calendarDate(first.date))} — {date.format(calendarDate(last.date))} · {t('statsApp.chartPeak', { count: peak, unit })}</p> : null}
  </figure>
}

export function StatsCharts({ days }: { days: StatsDay[] }) {
  const { t } = useTranslation()
  if (!days.length) return null
  return <section className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-label={t('statsApp.charts')}>
    <Chart title={t('statsApp.wordsChart')} values={days.map((day) => day.wordsAdded)} days={days} unit={t('statsApp.chartUnitWords')} />
    <Chart title={t('statsApp.timeChart')} values={days.map((day) => Math.round(day.activeSeconds / 60))} days={days} unit={t('statsApp.chartUnitMinutes')} />
  </section>
}
