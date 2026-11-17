import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/stores/settings-store'
import { VersioningSection } from './sections/VersioningSection'
import { AiSettingsSection } from './sections/AiSettingsSection'
import { LoadingState } from '@/components/ui/LoadingState'
import './settings.css'

export function SettingsPage() {
  const { t } = useTranslation()
  const { loadSettings, settings, loading, error } = useSettingsStore()

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  return (
    <div className="settings-page">
      <header className="settings-masthead">
        <h1>{t('settings.title')}</h1>
        <p>{t('settings.intro')}</p>
      </header>

      {error && (
        <p className="settings-alert" role="alert">{error}</p>
      )}

      {!settings && loading ? (
        <LoadingState />
      ) : (
        <div className="settings-folio">
          <AiSettingsSection />
          <VersioningSection />
        </div>
      )}
    </div>
  )
}
