import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/stores/settings-store'
import { VersioningSection } from './sections/VersioningSection'
import { Settings } from 'lucide-react'

export function SettingsPage() {
  const { t } = useTranslation()
  const { loadSettings, loading, error } = useSettingsStore()

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Settings size={24} className="text-[var(--color-accent)]" />
        <h1 className="text-2xl font-bold text-[var(--color-ink)]">{t('settings.title')}</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !error ? (
        <div className="flex items-center justify-center py-12 text-[var(--color-muted)]">
          {t('common.loading')}
        </div>
      ) : (
        <div className="space-y-8">
          <VersioningSection />
        </div>
      )}
    </div>
  )
}
