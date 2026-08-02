import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/stores/settings-store'
import type { AutoVersionConfig } from '@/types/settings'
import { Clock, LogOut, Timer, Calendar, CalendarDays, CalendarRange } from 'lucide-react'

interface TriggerRowProps {
  icon: React.ReactNode
  label: string
  description: string
  enabled: boolean
  intervalMs?: number
  intervalOptions?: { value: number; label: string }[]
  onToggle: () => void
  onIntervalChange?: (ms: number) => void
}

function TriggerRow({ icon, label, description, enabled, intervalMs, intervalOptions, onToggle, onIntervalChange }: TriggerRowProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-start gap-4 py-4 border-b border-[var(--color-border)] last:border-b-0">
      <div className="mt-1 text-[var(--color-muted)]">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-[var(--color-ink)]">{label}</p>
            <p className="text-sm text-[var(--color-muted)]">{description}</p>
          </div>
          <button
            role="switch"
            aria-checked={enabled}
            aria-label={`${t('settings.autoVersion.enabled')}: ${label}`}
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 ${
              enabled ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        {enabled && intervalOptions && onIntervalChange && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-[var(--color-muted)]">{t('settings.autoVersion.interval')}:</span>
            <select
              value={intervalMs}
              onChange={(e) => onIntervalChange(Number(e.target.value))}
              className="rounded border border-[var(--color-border)] bg-[var(--color-paper)] px-2 py-1 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              {intervalOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}

export function VersioningSection() {
  const { t } = useTranslation()
  const { settings, updateSettings } = useSettingsStore()

  const config = (settings?.autoVersion ?? {
    inactivity: { enabled: true, intervalMs: 5 * 60 * 1000 },
    exit: { enabled: true },
    hourly: { enabled: true, intervalMs: 60 * 60 * 1000 },
    daily: { enabled: true, intervalMs: 24 * 60 * 60 * 1000 },
    weekly: { enabled: true, intervalMs: 7 * 24 * 60 * 60 * 1000 },
    monthly: { enabled: true, intervalMs: 30 * 24 * 60 * 60 * 1000 },
  }) as AutoVersionConfig

  const updateTrigger = (key: keyof AutoVersionConfig, enabled: boolean, intervalMs?: number) => {
    const current = config[key]
    const updated = { ...config }
    if (key === 'exit') {
      updated[key] = { ...current, enabled } as AutoVersionConfig['exit']
    } else {
      updated[key] = { ...current, enabled, ...(intervalMs !== undefined && { intervalMs }) } as AutoVersionConfig[typeof key]
    }
    updateSettings({ autoVersion: updated })
  }

  const inactivityOptions = [
    { value: 2 * 60 * 1000, label: `2 ${t('settings.autoVersion.minutes')}` },
    { value: 5 * 60 * 1000, label: `5 ${t('settings.autoVersion.minutes')}` },
    { value: 10 * 60 * 1000, label: `10 ${t('settings.autoVersion.minutes')}` },
    { value: 15 * 60 * 1000, label: `15 ${t('settings.autoVersion.minutes')}` },
    { value: 30 * 60 * 1000, label: `30 ${t('settings.autoVersion.minutes')}` },
  ]

  const hourlyOptions = [
    { value: 30 * 60 * 1000, label: `30 ${t('settings.autoVersion.minutes')}` },
    { value: 60 * 60 * 1000, label: `1 ${t('settings.autoVersion.hours')}` },
    { value: 2 * 60 * 60 * 1000, label: `2 ${t('settings.autoVersion.hours')}` },
    { value: 4 * 60 * 60 * 1000, label: `4 ${t('settings.autoVersion.hours')}` },
  ]

  const dailyOptions = [
    { value: 12 * 60 * 60 * 1000, label: `12 ${t('settings.autoVersion.hours')}` },
    { value: 24 * 60 * 60 * 1000, label: `1 ${t('settings.autoVersion.days')}` },
    { value: 2 * 24 * 60 * 60 * 1000, label: `2 ${t('settings.autoVersion.days')}` },
  ]

  const weeklyOptions = [
    { value: 3 * 24 * 60 * 60 * 1000, label: `3 ${t('settings.autoVersion.days')}` },
    { value: 7 * 24 * 60 * 60 * 1000, label: `1 ${t('settings.autoVersion.weeks')}` },
    { value: 2 * 7 * 24 * 60 * 60 * 1000, label: `2 ${t('settings.autoVersion.weeks')}` },
  ]

  const monthlyOptions = [
    { value: 7 * 24 * 60 * 60 * 1000, label: `1 ${t('settings.autoVersion.weeks')}` },
    { value: 14 * 24 * 60 * 60 * 1000, label: `2 ${t('settings.autoVersion.weeks')}` },
    { value: 30 * 24 * 60 * 60 * 1000, label: `1 ${t('settings.autoVersion.months')}` },
  ]

  return (
    <section>
      <h2 className="text-lg font-semibold text-[var(--color-ink)] mb-1">{t('settings.autoVersion.title')}</h2>
      <p className="text-sm text-[var(--color-muted)] mb-4">{t('settings.autoVersion.description')}</p>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-4">
        <TriggerRow
          icon={<Timer size={18} />}
          label={t('settings.autoVersion.inactivity')}
          description={t('settings.autoVersion.inactivityDesc')}
          enabled={config.inactivity.enabled}
          intervalMs={config.inactivity.intervalMs}
          intervalOptions={inactivityOptions}
          onToggle={() => updateTrigger('inactivity', !config.inactivity.enabled)}
          onIntervalChange={(ms) => updateTrigger('inactivity', config.inactivity.enabled, ms)}
        />
        <TriggerRow
          icon={<LogOut size={18} />}
          label={t('settings.autoVersion.exit')}
          description={t('settings.autoVersion.exitDesc')}
          enabled={config.exit.enabled}
          onToggle={() => updateTrigger('exit', !config.exit.enabled)}
        />
        <TriggerRow
          icon={<Clock size={18} />}
          label={t('settings.autoVersion.hourly')}
          description={t('settings.autoVersion.hourlyDesc')}
          enabled={config.hourly.enabled}
          intervalMs={config.hourly.intervalMs}
          intervalOptions={hourlyOptions}
          onToggle={() => updateTrigger('hourly', !config.hourly.enabled)}
          onIntervalChange={(ms) => updateTrigger('hourly', config.hourly.enabled, ms)}
        />
        <TriggerRow
          icon={<Calendar size={18} />}
          label={t('settings.autoVersion.daily')}
          description={t('settings.autoVersion.dailyDesc')}
          enabled={config.daily.enabled}
          intervalMs={config.daily.intervalMs}
          intervalOptions={dailyOptions}
          onToggle={() => updateTrigger('daily', !config.daily.enabled)}
          onIntervalChange={(ms) => updateTrigger('daily', config.daily.enabled, ms)}
        />
        <TriggerRow
          icon={<CalendarDays size={18} />}
          label={t('settings.autoVersion.weekly')}
          description={t('settings.autoVersion.weeklyDesc')}
          enabled={config.weekly.enabled}
          intervalMs={config.weekly.intervalMs}
          intervalOptions={weeklyOptions}
          onToggle={() => updateTrigger('weekly', !config.weekly.enabled)}
          onIntervalChange={(ms) => updateTrigger('weekly', config.weekly.enabled, ms)}
        />
        <TriggerRow
          icon={<CalendarRange size={18} />}
          label={t('settings.autoVersion.monthly')}
          description={t('settings.autoVersion.monthlyDesc')}
          enabled={config.monthly.enabled}
          intervalMs={config.monthly.intervalMs}
          intervalOptions={monthlyOptions}
          onToggle={() => updateTrigger('monthly', !config.monthly.enabled)}
          onIntervalChange={(ms) => updateTrigger('monthly', config.monthly.enabled, ms)}
        />
      </div>
    </section>
  )
}
