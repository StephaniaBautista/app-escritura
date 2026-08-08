import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { settingsApi } from '@/services/settings'
import { useAuthStore } from '@/stores/auth-store'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es'
    i18n.changeLanguage(newLang)
    if (isAuthenticated) {
      try {
        await settingsApi.update({ language: newLang })
      } catch {
        // La preferencia de idioma no persiste si el guardado falla, pero el cambio aplica
      }
    }
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded transition-all hover:opacity-80"
      style={{
        color: 'var(--color-ink-light)',
        border: '1px solid var(--color-paper-lines)',
        background: 'var(--color-paper)',
      }}
      aria-label="Change language"
    >
      <Globe className="w-3.5 h-3.5" />
      <span className="uppercase">{i18n.language === 'es' ? 'EN' : 'ES'}</span>
    </button>
  )
}
