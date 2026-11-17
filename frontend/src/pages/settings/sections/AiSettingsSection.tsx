import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/stores/settings-store'
import { isTrainingPreset, isAiPreset, AI_PRESETS, type AiPresetId } from '@/lib/ai-presets'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TrainingMuteCheckbox } from '@/components/ai/TrainingMuteCheckbox'
import { SettingsSwitch } from '../SettingsSwitch'
import type { AiModeStatus, AiToolPresets } from '@/types/settings'

const TOOLS: (keyof AiToolPresets)[] = ['review', 'wizard', 'timeline', 'characters']

function modeLabel(t: (key: string) => string, mode: AiModeStatus) {
  const name = t(`aiApp.presets.${mode.id}.name`)
  if (mode.comingSoon) return `${name} (${t('aiApp.comingSoon')})`
  if (!mode.available) return `${name} (${t('aiApp.unavailable')})`
  return name
}

export function AiSettingsSection() {
  const { t } = useTranslation()
  const { settings, updateSettings, getUiPrefs } = useSettingsStore()
  const prefs = getUiPrefs()
  const modes = settings?.aiModes ?? AI_PRESETS.map((id) => ({
    id, available: true, trainsData: id !== 'sealed' && id !== 'private', comingSoon: false,
  }))
  const reviewOn = prefs.reviewEnabledByDefault === true
  const [pending, setPending] = useState<{ tool: keyof AiToolPresets; id: AiPresetId } | null>(null)
  const [busy, setBusy] = useState(false)
  const [mute, setMute] = useState(false)

  const savePresets = async (aiToolPresets: AiToolPresets) => {
    setBusy(true)
    try {
      await updateSettings({ uiPrefs: { aiToolPresets } })
    } finally {
      setBusy(false)
    }
  }

  const choose = (tool: keyof AiToolPresets, value: string) => {
    if (!isAiPreset(value)) return
    const mode = modes.find((item) => item.id === value)
    if (!mode || !mode.available || mode.comingSoon) return
    const dismissed = prefs.dismissedAiTrainingModes ?? []
    if (isTrainingPreset(value) && !dismissed.includes(value)) {
      setMute(false)
      setPending({ tool, id: value })
      return
    }
    void savePresets({ ...prefs.aiToolPresets, [tool]: value })
  }

  const applyPending = async (persist: boolean) => {
    if (!pending) return
    setBusy(true)
    try {
      if (persist) await useSettingsStore.getState().dismissAiTrainingMode(pending.id)
      await updateSettings({ uiPrefs: { aiToolPresets: { ...getUiPrefs().aiToolPresets, [pending.tool]: pending.id } } })
    } finally {
      setBusy(false)
      setPending(null)
    }
  }

  return (
    <section className="settings-block">
      <h2 className="settings-block__title">{t('settings.ai.title')}</h2>
      <p className="settings-block__lede">{t('settings.ai.description')}</p>
      <div className="settings-blotter">
        <div className="settings-blotter__review">
          <div>
            <h3>{t('settings.ai.reviewDefault')}</h3>
            <p>{t('settings.ai.reviewDefaultDesc')}</p>
          </div>
          <SettingsSwitch
            checked={reviewOn}
            disabled={busy}
            label={t('settings.ai.reviewDefault')}
            onToggle={() => { void updateSettings({ uiPrefs: { reviewEnabledByDefault: !reviewOn } }) }}
          />
        </div>
        <div className="settings-tools">
          {TOOLS.map((tool) => {
            const selected = prefs.aiToolPresets?.[tool] ?? modes.find((item) => item.available)?.id ?? ''
            return (
              <div key={tool} className="settings-tool">
                <h3>{t(`settings.ai.tools.${tool}`)}</h3>
                <p>{t(`settings.ai.tools.${tool}Desc`)}</p>
                <label>
                  <span className="sr-only">{t(`settings.ai.tools.${tool}`)}: {t('settings.ai.mode')}</span>
                  <select
                    value={selected}
                    disabled={busy}
                    aria-label={`${t(`settings.ai.tools.${tool}`)}: ${t('settings.ai.mode')}`}
                    onChange={(event) => choose(tool, event.target.value)}
                    className="settings-field"
                  >
                    {modes.map((mode) => (
                      <option key={mode.id} value={mode.id} disabled={!mode.available || mode.comingSoon}>
                        {modeLabel(t, mode)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )
          })}
        </div>
      </div>
      <ConfirmDialog
        isOpen={pending !== null}
        title={t('aiApp.training.title')}
        message={pending ? t(`aiApp.presets.${pending.id}.warning`) : ''}
        confirmLabel={t('aiApp.training.continue')}
        cancelLabel={t('common.cancel')}
        variant="default"
        loading={busy}
        onConfirm={() => { void applyPending(mute) }}
        onCancel={() => { setPending(null); setMute(false) }}
      >
        <TrainingMuteCheckbox checked={mute} disabled={busy || !pending} onChange={setMute} />
      </ConfirmDialog>
    </section>
  )
}
