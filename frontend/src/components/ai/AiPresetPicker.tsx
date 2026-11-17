import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAiStore } from '@/stores/ai-store'
import { useSettingsStore } from '@/stores/settings-store'
import { isTrainingPreset, isAiPreset, type AiPresetId } from '@/lib/ai-presets'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TrainingMuteCheckbox } from './TrainingMuteCheckbox'
import './ai.css'

export function AiProviderSelect() {
  const { t } = useTranslation()
  const { capabilities, provider, setProvider } = useAiStore()
  const { loadSettings, getUiPrefs, dismissAiTrainingMode } = useSettingsStore()
  const [pending, setPending] = useState<AiPresetId | null>(null)
  const [busy, setBusy] = useState(false)
  const [mute, setMute] = useState(false)

  useEffect(() => { void loadSettings() }, [loadSettings])

  useEffect(() => {
    if (!capabilities) return
    const current = capabilities.providers.find((item) => item.id === provider)
    if (current?.available) return
    const first = capabilities.providers.find((item) => item.available)
    if (first) setProvider(first.id)
  }, [capabilities, provider, setProvider])

  const dismissed = getUiPrefs().dismissedAiTrainingModes ?? []

  const apply = async (id: AiPresetId, persist: boolean) => {
    if (persist) {
      setBusy(true)
      try { await dismissAiTrainingMode(id) }
      finally { setBusy(false) }
    }
    setProvider(id)
    setPending(null)
  }

  const choose = (id: string) => {
    if (!isAiPreset(id)) return
    if (!isTrainingPreset(id) || dismissed.includes(id)) {
      setProvider(id)
      return
    }
    setPending(id)
    setMute(false)
  }

  return (
    <div className="space-y-2">
      <fieldset className="space-y-2">
        <legend className="text-xs ai-panel__muted">{t('aiApp.presetLegend')}</legend>
        <div className="space-y-2">
          {(capabilities?.providers ?? []).map((item) => (
            <label key={item.id} className={`ai-preset${provider === item.id ? ' ai-preset--active' : ''}${item.available ? '' : ' ai-preset--disabled'}`}>
              <input
                type="radio"
                name="ai-preset"
                value={item.id}
                checked={provider === item.id}
                disabled={!item.available}
                aria-label={t(`aiApp.presets.${item.id}.name`)}
                onChange={() => choose(item.id)}
              />
              <span>
                <span className="ai-preset__name">{t(`aiApp.presets.${item.id}.name`)}</span>
                <span className="ai-preset__hint">{t(`aiApp.presets.${item.id}.hint`)}</span>
                {item.comingSoon
                  ? <span className="ai-preset__hint">{t('aiApp.comingSoon')}</span>
                  : !item.available && <span className="ai-preset__hint">{t('aiApp.unavailable')}</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <ConfirmDialog
        isOpen={pending !== null}
        title={t('aiApp.training.title')}
        message={pending ? t(`aiApp.presets.${pending}.warning`) : ''}
        confirmLabel={t('aiApp.training.continue')}
        cancelLabel={t('common.cancel')}
        variant="default"
        loading={busy}
        onConfirm={() => { if (pending) void apply(pending, mute) }}
        onCancel={() => { setPending(null); setMute(false) }}
      >
        <TrainingMuteCheckbox checked={mute} disabled={busy || !pending} onChange={setMute} />
      </ConfirmDialog>
    </div>
  )
}
