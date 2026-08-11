import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { CORE_RESOURCES, CORE_NAMESPACES } from './core-resources'
import { i18nHttpBackend } from '@/services/i18n-backend'

const SUPPORTED_LANGUAGES = ['es', 'en'] as const

function detectBrowserLanguage(): string {
  if (typeof navigator === 'undefined') return 'es'
  const lang = navigator.language?.toLowerCase().slice(0, 2)
  return SUPPORTED_LANGUAGES.includes(lang as (typeof SUPPORTED_LANGUAGES)[number]) ? lang : 'es'
}

const ALL_NAMESPACES = [
  ...CORE_NAMESPACES,
  'storySetup', 'notes', 'postit', 'versions', 'branches', 'editorApp', 'admin',
  'characterApp', 'timelineApp', 'diagramApp',
] as const

i18n
  .use(i18nHttpBackend)
  .use(initReactI18next)
  .init({
    resources: CORE_RESOURCES,
    backend: {
      loadPath: '/api/i18n/{{lng}}/{{ns}}',
    },
    lng: detectBrowserLanguage(),
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    ns: ALL_NAMESPACES,
    defaultNS: 'common',
    nsSeparator: '.',
    keySeparator: '.',
    load: 'currentOnly',
    partialBundledLanguages: true,
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
