import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/stores/settings-store'
import type { AutoVersionConfig } from '@/types/settings'
import { SettingsSwitch } from '../SettingsSwitch'

interface TriggerRowProps {
  label: string
  description: string
  enabled: boolean
  intervalMs?: number
  intervalOptions?: { value: number; label: string }[]
  onToggle: () => void
  onIntervalChange?: (ms: number) => void
}

function TriggerRow({ label, description, enabled, intervalMs, intervalOptions, onToggle, onIntervalChange }: TriggerRowProps) {
  const { t } = useTranslation()

  return (
    <div className="settings-tick" data-on={enabled ? 'true' : 'false'}>
      <div className="settings-tick__head">
        <div>
          <h3>{label}</h3>
          <p>{description}</p>
        </div>
        <SettingsSwitch
          checked={enabled}
          label={`${t('settings.autoVersion.enabled')}: ${label}`}
          onToggle={onToggle}
        />
      </div>
      {enabled && intervalOptions && onIntervalChange && (
        <div className="settings-tick__interval">
          <span>{t('settings.autoVersion.interval')}</span>
          <select
            value={intervalMs}
            aria-label={`${label}: ${t('settings.autoVersion.interval')}`}
            onChange={(e) => onIntervalChange(Number(e.target.value))}
            className="settings-field"
          >
            {intervalOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}
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
    void updateSettings({ autoVersion: updated })
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
    { value: 3 * 24 * 60 * 1000, label: `3 ${t('settings.autoVersion.days')}` },
    { value: 7 * 24 * 60 * 1000, label: `1 ${t('settings.autoVersion.weeks')}` },
    { value: 2 * 7 * 24 * 60 * 60 * 1000, label: `2 ${t('settings.autoVersion.weeks')}` },
  ]

  const monthlyOptions = [
    { value: 7 * 24 * 60 * 60 * 1000, label: `1 ${t('settings.autoVersion.weeks')}` },
    { value: 14 * 24 * 60 * 60 * 1000, label: `2 ${t('settings.autoVersion.weeks')}` },
    { value: 30 * 24 * 60 * 60 * 1000, label: `1 ${t('settings.autoVersion.months')}` },
  ]

  return (
    <section className="settings-block">
      <h2 className="settings-block__title">{t('settings.autoVersion.title')}</h2>
      <p className="settings-block__lede">{t('settings.autoVersion.description')}</p>
      <div className="settings-spine">
        <TriggerRow
          label={t('settings.autoVersion.inactivity')}
          description={t('settings.autoVersion.inactivityDesc')}
          enabled={config.inactivity.enabled}
          intervalMs={config.inactivity.intervalMs}
          intervalOptions={inactivityOptions}
          onToggle={() => updateTrigger('inactivity', !config.inactivity.enabled)}
          onIntervalChange={(ms) => updateTrigger('inactivity', config.inactivity.enabled, ms)}
        />
        <TriggerRow
          label={t('settings.autoVersion.exit')}
          description={t('settings.autoVersion.exitDesc')}
          enabled={config.exit.enabled}
          onToggle={() => updateTrigger('exit', !config.exit.enabled)}
        />
        <TriggerRow
          label={t('settings.autoVersion.hourly')}
          description={t('settings.autoVersion.hourlyDesc')}
          enabled={config.hourly.enabled}
          intervalMs={config.hourly.intervalMs}
          intervalOptions={hourlyOptions}
          onToggle={() => updateTrigger('hourly', !config.hourly.enabled)}
          onIntervalChange={(ms) => updateTrigger('hourly', config.hourly.enabled, ms)}
        />
        <TriggerRow
          label={t('settings.autoVersion.daily')}
          description={t('settings.autoVersion.dailyDesc')}
          enabled={config.daily.enabled}
          intervalMs={config.daily.intervalMs}
          intervalOptions={dailyOptions}
          onToggle={() => updateTrigger('daily', !config.daily.enabled)}
          onIntervalChange={(ms) => updateTrigger('daily', config.daily.enabled, ms)}
        />
        <TriggerRow
          label={t('settings.autoVersion.weekly')}
          description={t('settings.autoVersion.weeklyDesc')}
          enabled={config.weekly.enabled}
          intervalMs={config.weekly.intervalMs}
          intervalOptions={weeklyOptions}
          onToggle={() => updateTrigger('weekly', !config.weekly.enabled)}
          onIntervalChange={(ms) => updateTrigger('weekly', config.weekly.enabled, ms)}
        />
        <TriggerRow
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
