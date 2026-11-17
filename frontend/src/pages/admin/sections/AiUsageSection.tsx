import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { adminApi, type AiUsageReport, type AiWebSearchStatus } from '@/services/admin'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { AiUsageCharts } from './AiUsageCharts'

function defaultFrom() {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - 30)
  return date.toISOString().slice(0, 10)
}

function defaultTo() {
  return new Date().toISOString().slice(0, 10)
}

function money(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

export function AiUsageSection() {
  const { t } = useTranslation()
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [report, setReport] = useState<AiUsageReport | null>(null)
  const [search, setSearch] = useState<AiWebSearchStatus | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchLoading, setSearchLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async (rangeFrom = from, rangeTo = to) => {
    setLoading(true)
    try {
      const data = await adminApi.aiUsage(`${rangeFrom}T00:00:00.000Z`, `${rangeTo}T23:59:59.999Z`)
      setReport(data)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const loadSearch = async () => {
    setSearchLoading(true)
    try {
      setSearch(await adminApi.aiWebSearch())
      setSearchError(null)
    } catch (err: unknown) {
      setSearch(null)
      setSearchError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSearchLoading(false)
    }
  }

  useEffect(() => { void load(); void loadSearch() }, [])

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold" style={{ color: 'var(--color-ink)' }}>{t('admin.aiUsage.title')}</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-light)' }}>{t('admin.aiUsage.intro')}</p>
      </div>
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); void load() }}>
        <label className="text-sm space-y-1">
          <span className="block" style={{ color: 'var(--color-ink-light)' }}>{t('admin.aiUsage.from')}</span>
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)', color: 'var(--color-ink)' }} />
        </label>
        <label className="text-sm space-y-1">
          <span className="block" style={{ color: 'var(--color-ink-light)' }}>{t('admin.aiUsage.to')}</span>
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)', color: 'var(--color-ink)' }} />
        </label>
        <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--color-accent-light)', color: 'var(--color-ink)' }}>
          {t('admin.aiUsage.apply')}
        </button>
      </form>
      <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)' }}>
        <h3 className="font-display font-semibold" style={{ color: 'var(--color-ink)' }}>{t('admin.aiUsage.webSearchTitle')}</h3>
        <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>{t('admin.aiUsage.webSearchIntro')}</p>
        {searchLoading && <LoadingState />}
        {searchError && <ErrorMessage message={searchError} />}
        {!searchLoading && !searchError && search && (
          <dl className="grid gap-2 text-sm sm:grid-cols-3" style={{ color: 'var(--color-ink)' }}>
            <div>
              <dt className="text-xs" style={{ color: 'var(--color-ink-light)' }}>{t('admin.aiUsage.webSearchEngine')}</dt>
              <dd>{t(search.engine === 'brave' ? 'admin.aiUsage.webSearchBrave' : 'admin.aiUsage.webSearchDdg')}</dd>
            </div>
            <div>
              <dt className="text-xs" style={{ color: 'var(--color-ink-light)' }}>{t('admin.aiUsage.webSearchKey')}</dt>
              <dd>{t(search.keyConfigured ? 'admin.aiUsage.webSearchConfigured' : 'admin.aiUsage.webSearchMissing')}</dd>
            </div>
            <div>
              <dt className="text-xs" style={{ color: 'var(--color-ink-light)' }}>{t('admin.aiUsage.webSearchStatus')}</dt>
              <dd>{search.ok ? t('admin.aiUsage.webSearchOk', { count: search.hits }) : t('admin.aiUsage.webSearchFail')}</dd>
            </div>
          </dl>
        )}
        <button type="button" className="px-3 py-1.5 rounded-lg text-sm" style={{ border: '1px solid var(--color-paper-lines)', color: 'var(--color-ink)' }} onClick={() => { void loadSearch() }}>
          {t('admin.aiUsage.webSearchRetry')}
        </button>
      </div>
      {loading && <LoadingState />}
      {error && <ErrorMessage message={error} />}
      {!loading && !error && report && report.models.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>{t('admin.aiUsage.empty')}</p>
      )}
      {!loading && !error && report && report.models.length > 0 && (
        <>
        <AiUsageCharts report={{ ...report, days: report.days ?? [] }} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left" style={{ color: 'var(--color-ink)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-paper-lines)' }}>
                <th className="py-2 pr-3 font-medium">{t('admin.aiUsage.vendor')}</th>
                <th className="py-2 pr-3 font-medium">{t('admin.aiUsage.model')}</th>
                <th className="py-2 pr-3 font-medium">{t('admin.aiUsage.preset')}</th>
                <th className="py-2 pr-3 font-medium">{t('admin.aiUsage.requests')}</th>
                <th className="py-2 pr-3 font-medium">{t('admin.aiUsage.prompt')}</th>
                <th className="py-2 pr-3 font-medium">{t('admin.aiUsage.completion')}</th>
                <th className="py-2 pr-3 font-medium">{t('admin.aiUsage.total')}</th>
                <th className="py-2 font-medium">{t('admin.aiUsage.cost')}</th>
              </tr>
            </thead>
            <tbody>
              {report.models.map((row) => (
                <tr key={`${row.vendor}-${row.model}-${row.preset}`} style={{ borderBottom: '1px solid var(--color-paper-lines)' }}>
                  <td className="py-2 pr-3">{row.vendor}</td>
                  <td className="py-2 pr-3">{row.model}</td>
                  <td className="py-2 pr-3">{row.preset}</td>
                  <td className="py-2 pr-3">{row.requests}</td>
                  <td className="py-2 pr-3">{row.promptTokens}</td>
                  <td className="py-2 pr-3">{row.completionTokens}</td>
                  <td className="py-2 pr-3">{row.totalTokens}</td>
                  <td className="py-2">{money(row.estimatedUsd)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2 pr-3 font-semibold" colSpan={3}>{t('admin.aiUsage.totals')}</td>
                <td className="py-2 pr-3 font-semibold">{report.totals.requests}</td>
                <td className="py-2 pr-3 font-semibold">{report.totals.promptTokens}</td>
                <td className="py-2 pr-3 font-semibold">{report.totals.completionTokens}</td>
                <td className="py-2 pr-3 font-semibold">{report.totals.totalTokens}</td>
                <td className="py-2 font-semibold">{money(report.totals.estimatedUsd)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  )
}
