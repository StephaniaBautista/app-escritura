import i18n from './index'

const SUPPORTED = ['es', 'en'] as const
type SupportedLang = (typeof SUPPORTED)[number]

export function applySavedLanguage(settingsLanguage?: string) {
  const lng = settingsLanguage && SUPPORTED.includes(settingsLanguage as SupportedLang)
    ? (settingsLanguage as SupportedLang)
    : detectBrowserLanguage()
  i18n.changeLanguage(lng)
}

function detectBrowserLanguage(): SupportedLang {
  if (typeof navigator === 'undefined') return 'es'
  const lang = navigator.language?.toLowerCase().slice(0, 2)
  return SUPPORTED.includes(lang as SupportedLang) ? (lang as SupportedLang) : 'es'
}
