import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es'
    i18n.changeLanguage(newLang)
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
