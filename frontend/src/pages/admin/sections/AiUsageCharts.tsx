import { useTranslation } from 'react-i18next'
import type { AiUsageReport } from '@/services/admin'
import { chartAreaPath, chartPolyline } from '@/lib/stats-chart'
import { barRects, heatLevel, pieSlices } from '@/lib/ai-usage-charts'
import './ai-usage-charts.css'

function SeriesChart({ title, values, unit, first, last }: { title: string; values: number[]; unit: string; first?: string; last?: string }) {
  const { t, i18n } = useTranslation()
  const peak = Math.max(...values, 0)
  const date = new Intl.DateTimeFormat(i18n.language ?? 'es', { timeZone: 'UTC', day: 'numeric', month: 'short' })
  return (
    <figure className="ai-usage-chart space-y-3">
      <figcaption>{title}</figcaption>
      <svg viewBox="0 0 320 120" role="img" aria-label={`${title}: ${peak} ${unit}`}>
        <path className="ai-usage-chart-fill" d={chartAreaPath(values, 320, 120)} />
        <polyline className="ai-usage-chart-line" points={chartPolyline(values, 320, 120)} />
      </svg>
      {first && last ? (
        <p className="ai-usage-chart-muted">
          {date.format(new Date(`${first}T00:00:00.000Z`))} — {date.format(new Date(`${last}T00:00:00.000Z`))} · {t('admin.aiUsage.chartPeak', { value: peak, unit })}
        </p>
      ) : null}
    </figure>
  )
}

function PieChart({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const slices = pieSlices(rows)
  if (!slices.length) return null
  return (
    <figure className="ai-usage-chart space-y-3">
      <figcaption>{title}</figcaption>
      <svg viewBox="0 0 120 120" role="img" aria-label={title}>
        {slices.map((slice, index) => (
          <path key={slice.label} className={`ai-usage-slice-${index % 6}`} d={slice.d} />
        ))}
        <circle cx="60" cy="60" r="22" fill="var(--color-paper)" />
      </svg>
      <ul className="ai-usage-legend">
        {slices.map((slice, index) => (
          <li key={slice.label}>
            <span className={`ai-usage-swatch ai-usage-slice-${index % 6}`} />
            {slice.label} · {Math.round(slice.percent * 100)}%
          </li>
        ))}
      </ul>
    </figure>
  )
}

export function AiUsageCharts({ report }: { report: AiUsageReport }) {
  const { t } = useTranslation()
  const days = report.days
  if (!days.length) return null
  const first = days[0]?.date
  const last = days[days.length - 1]?.date
  const maxCalls = Math.max(...days.map((day) => day.requests), 0)
  const bars = barRects(report.models.map((row) => ({ label: row.model, value: row.estimatedUsd })))
  const tokenTotal = report.totals.promptTokens + report.totals.completionTokens
  const promptShare = tokenTotal ? (report.totals.promptTokens / tokenTotal) * 100 : 0
  const completionShare = tokenTotal ? (report.totals.completionTokens / tokenTotal) * 100 : 0

  return (
    <section className="ai-usage-charts" aria-label={t('admin.aiUsage.charts')}>
      <SeriesChart title={t('admin.aiUsage.chartTokens')} values={days.map((day) => day.totalTokens)} unit={t('admin.aiUsage.chartUnitTokens')} first={first} last={last} />
      <SeriesChart title={t('admin.aiUsage.chartCost')} values={days.map((day) => day.estimatedUsd)} unit={t('admin.aiUsage.chartUnitUsd')} first={first} last={last} />
      <SeriesChart title={t('admin.aiUsage.chartRequests')} values={days.map((day) => day.requests)} unit={t('admin.aiUsage.chartUnitCalls')} first={first} last={last} />
      <figure className="ai-usage-chart space-y-3">
        <figcaption>{t('admin.aiUsage.chartCostByModel')}</figcaption>
        <svg viewBox="0 0 320 140" role="img" aria-label={t('admin.aiUsage.chartCostByModel')}>
          {bars.map((bar, index) => (
            <g key={bar.label}>
              <rect className={`ai-usage-slice-${index % 6}`} x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx="2" />
              <title>{`${bar.label}: ${bar.value}`}</title>
            </g>
          ))}
        </svg>
        <ul className="ai-usage-legend">
          {bars.map((bar, index) => (
            <li key={bar.label}>
              <span className={`ai-usage-swatch ai-usage-slice-${index % 6}`} />
              {bar.label}
            </li>
          ))}
        </ul>
      </figure>
      <PieChart title={t('admin.aiUsage.chartByVendor')} rows={report.models.map((row) => ({ label: row.vendor, value: row.totalTokens }))} />
      <PieChart title={t('admin.aiUsage.chartByPreset')} rows={report.models.map((row) => ({ label: row.preset, value: row.requests }))} />
      <figure className="ai-usage-chart space-y-3 ai-usage-charts-wide">
        <figcaption>{t('admin.aiUsage.chartTokenMix')}</figcaption>
        <div className="ai-usage-stack" role="img" aria-label={t('admin.aiUsage.chartTokenMix')}>
          <div className="ai-usage-stack-prompt" style={{ width: `${promptShare}%` }} />
          <div className="ai-usage-stack-completion" style={{ width: `${completionShare}%` }} />
        </div>
        <ul className="ai-usage-legend">
          <li><span className="ai-usage-swatch ai-usage-bar-prompt" />{t('admin.aiUsage.chartPromptShare')} · {report.totals.promptTokens}</li>
          <li><span className="ai-usage-swatch ai-usage-bar-completion" />{t('admin.aiUsage.chartCompletionShare')} · {report.totals.completionTokens}</li>
        </ul>
      </figure>
      <figure className="ai-usage-chart space-y-3 ai-usage-charts-wide">
        <figcaption>{t('admin.aiUsage.chartHeat')}</figcaption>
        <div className="ai-usage-heat" role="img" aria-label={t('admin.aiUsage.chartHeat')}>
          {days.map((day) => (
            <span
              key={day.date}
              className={`ai-usage-heat-cell ai-usage-heat-${heatLevel(day.requests, maxCalls)}`}
              title={`${day.date}: ${day.requests}`}
            />
          ))}
        </div>
      </figure>
    </section>
  )
}
