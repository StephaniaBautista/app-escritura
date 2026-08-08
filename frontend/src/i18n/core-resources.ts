import esCommon from '../../../locales/es/common.json'
import esAuth from '../../../locales/es/auth.json'
import esNav from '../../../locales/es/nav.json'
import esHero from '../../../locales/es/hero.json'
import esFeatures from '../../../locales/es/features.json'
import esEditor from '../../../locales/es/editor.json'
import esCharacters from '../../../locales/es/characters.json'
import esTimeline from '../../../locales/es/timeline.json'
import esWorldbuilding from '../../../locales/es/worldbuilding.json'
import esAi from '../../../locales/es/ai.json'
import esStructure from '../../../locales/es/structure.json'
import esStats from '../../../locales/es/stats.json'
import esExportSection from '../../../locales/es/exportSection.json'
import esPricing from '../../../locales/es/pricing.json'
import esCta from '../../../locales/es/cta.json'
import esFooter from '../../../locales/es/footer.json'
import esPricingPage from '../../../locales/es/pricingPage.json'
import esComparison from '../../../locales/es/comparison.json'
import esFaq from '../../../locales/es/faq.json'
import esSidebar from '../../../locales/es/sidebar.json'
import esDashboard from '../../../locales/es/dashboard.json'
import esProjects from '../../../locales/es/projects.json'
import esFolder from '../../../locales/es/folder.json'
import esSettings from '../../../locales/es/settings.json'
import enCommon from '../../../locales/en/common.json'
import enAuth from '../../../locales/en/auth.json'
import enNav from '../../../locales/en/nav.json'
import enHero from '../../../locales/en/hero.json'
import enFeatures from '../../../locales/en/features.json'
import enEditor from '../../../locales/en/editor.json'
import enCharacters from '../../../locales/en/characters.json'
import enTimeline from '../../../locales/en/timeline.json'
import enWorldbuilding from '../../../locales/en/worldbuilding.json'
import enAi from '../../../locales/en/ai.json'
import enStructure from '../../../locales/en/structure.json'
import enStats from '../../../locales/en/stats.json'
import enExportSection from '../../../locales/en/exportSection.json'
import enPricing from '../../../locales/en/pricing.json'
import enCta from '../../../locales/en/cta.json'
import enFooter from '../../../locales/en/footer.json'
import enPricingPage from '../../../locales/en/pricingPage.json'
import enComparison from '../../../locales/en/comparison.json'
import enFaq from '../../../locales/en/faq.json'
import enSidebar from '../../../locales/en/sidebar.json'
import enDashboard from '../../../locales/en/dashboard.json'
import enProjects from '../../../locales/en/projects.json'
import enFolder from '../../../locales/en/folder.json'
import enSettings from '../../../locales/en/settings.json'

export const CORE_NAMESPACES = [
  'common', 'auth', 'nav', 'hero', 'features', 'editor', 'characters',
  'timeline', 'worldbuilding', 'ai', 'structure', 'stats', 'exportSection',
  'pricing', 'cta', 'footer', 'pricingPage', 'comparison', 'faq', 'sidebar',
  'dashboard', 'projects', 'folder', 'settings',
] as const

export const CORE_RESOURCES: Record<string, Record<string, Record<string, unknown>>> = {
  es: {
    common: esCommon,
    auth: esAuth,
    nav: esNav,
    hero: esHero,
    features: esFeatures,
    editor: esEditor,
    characters: esCharacters,
    timeline: esTimeline,
    worldbuilding: esWorldbuilding,
    ai: esAi,
    structure: esStructure,
    stats: esStats,
    exportSection: esExportSection,
    pricing: esPricing,
    cta: esCta,
    footer: esFooter,
    pricingPage: esPricingPage,
    comparison: esComparison,
    faq: esFaq,
    sidebar: esSidebar,
    dashboard: esDashboard,
    projects: esProjects,
    folder: esFolder,
    settings: esSettings,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    nav: enNav,
    hero: enHero,
    features: enFeatures,
    editor: enEditor,
    characters: enCharacters,
    timeline: enTimeline,
    worldbuilding: enWorldbuilding,
    ai: enAi,
    structure: enStructure,
    stats: enStats,
    exportSection: enExportSection,
    pricing: enPricing,
    cta: enCta,
    footer: enFooter,
    pricingPage: enPricingPage,
    comparison: enComparison,
    faq: enFaq,
    sidebar: enSidebar,
    dashboard: enDashboard,
    projects: enProjects,
    folder: enFolder,
    settings: enSettings,
  },
}
