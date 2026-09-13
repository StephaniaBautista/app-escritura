import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { StatsDay } from '@/types/stats'
import { calendarDate, calendarWeeks, completeStatsDays, contributionLevel } from './stats-calendar'

export function ContributionGraph({ days, from, to }: { days: StatsDay[]; from: string; to: string }) {
  const { t, i18n } = useTranslation()
  const [selected, setSelected] = useState(to)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dayRefs = useRef(new Map<string, HTMLButtonElement>())
  const completeDays = useMemo(() => completeStatsDays(from, to, days), [from, to, days])
  const weeks = useMemo(() => calendarWeeks(completeDays), [completeDays])
  const current = completeDays.find((day) => day.date === selected) ?? completeDays[completeDays.length - 1]
  const dateFormat = new Intl.DateTimeFormat(i18n.language, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })
  const monthFormat = new Intl.DateTimeFormat(i18n.language, { timeZone: 'UTC', month: 'short' })
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth }, [from, to])
  const moveFocus = (date: string, key: string) => {
    const index = completeDays.findIndex((day) => day.date === date)
    const next = { ArrowUp: index - 1, ArrowDown: index + 1, ArrowLeft: index - 7, ArrowRight: index + 7, Home: 0, End: completeDays.length - 1 }[key]
    if (next === undefined) return false
    const target = completeDays[Math.min(completeDays.length - 1, Math.max(0, next))]
    if (target) dayRefs.current.get(target.date)?.focus({ preventScroll: true })
    if (target && scrollRef.current) {
      const button = dayRefs.current.get(target.date)
      if (button) {
        const parent = scrollRef.current.getBoundingClientRect()
        const rect = button.getBoundingClientRect()
        if (rect.left < parent.left) scrollRef.current.scrollLeft -= parent.left - rect.left + 4
        if (rect.right > parent.right) scrollRef.current.scrollLeft += rect.right - parent.right + 4
      }
    }
    return true
  }
  const label = (day: StatsDay) => t('statsApp.dayLabel', { date: dateFormat.format(calendarDate(day.date)), count: day.wordsAdded })
  return <section className="space-y-3" aria-labelledby="stats-calendar-title">
    <div><h2 id="stats-calendar-title" className="font-display text-2xl font-bold">{t('statsApp.calendar')}</h2><p className="stats-muted text-sm">{dateFormat.format(calendarDate(from))} — {dateFormat.format(calendarDate(to))}</p></div>
    <div className="flex gap-2 items-start">
      <div aria-hidden="true" className="stats-weekdays stats-muted">{['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => <span key={day}>{t(`statsApp.weekdays.${day}`)}</span>)}</div>
      <div className="stats-calendar-scroll" ref={scrollRef} tabIndex={0} role="region" aria-label={t('statsApp.calendarScroll')}>
        <div className="stats-calendar">
          {weeks.map((week, index) => <div key={index}><div className="stats-month stats-muted" aria-hidden="true">{(index === 0 || week.some((day) => day?.date.endsWith('-01'))) ? monthFormat.format(calendarDate((week.find((day) => day?.date.endsWith('-01')) ?? week.find(Boolean))!.date)) : ''}</div><div className="stats-week">{week.map((day, weekday) => day ? <button key={day.date} type="button" ref={(element) => { if (element) dayRefs.current.set(day.date, element); else dayRefs.current.delete(day.date) }} tabIndex={current?.date === day.date ? 0 : -1} onKeyDown={(event) => { if (moveFocus(day.date, event.key)) event.preventDefault() }} className={`stats-day stats-level-${contributionLevel(day.wordsAdded)}`} data-date={day.date} aria-label={label(day)} aria-pressed={current?.date === day.date} title={label(day)} onFocus={() => setSelected(day.date)} onClick={() => setSelected(day.date)} /> : <span key={`blank-${weekday}`} aria-hidden="true" />)}</div></div>)}
        </div>
      </div>
    </div>
    <div className="flex flex-wrap justify-end items-center gap-1.5 text-xs stats-muted" aria-label={t('statsApp.intensity')}><span>{t('statsApp.less')}</span>{[0, 1, 2, 3, 4].map((level) => <span key={level} className={`stats-legend-cell stats-level-${level}`} aria-hidden="true" />)}<span>{t('statsApp.more')}</span></div>
    {current && <div aria-live="polite" className="border-t pt-3 text-sm" style={{ borderColor: 'var(--color-paper-lines)' }}><p className="font-semibold">{dateFormat.format(calendarDate(current.date))}</p><p className="stats-muted">{t('statsApp.dayDetail', { count: current.wordsAdded, minutes: Math.floor(current.activeSeconds / 60), seconds: Math.floor(current.activeSeconds % 60) })}</p></div>}
  </section>
}
