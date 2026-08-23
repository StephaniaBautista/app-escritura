import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, ScrollText, Users, BookOpen, Bug, Map as MapIcon } from 'lucide-react'
import { LoreSection } from './LoreSection'
import { RacesSection } from './RacesSection'
import { GlossarySection } from './GlossarySection'
import { CreaturesSection } from './CreaturesSection'
import { WorldMap } from './WorldMap'

type WorldTab = 'lore' | 'races' | 'glossary' | 'creatures' | 'map'

export function WorldsPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<WorldTab>('lore')

  const tabs: { id: WorldTab; label: string; icon: typeof Globe }[] = [
    { id: 'lore', label: t('worldApp.tabLore'), icon: ScrollText },
    { id: 'races', label: t('worldApp.tabRaces'), icon: Users },
    { id: 'glossary', label: t('worldApp.tabGlossary'), icon: BookOpen },
    { id: 'creatures', label: t('worldApp.tabCreatures'), icon: Bug },
    { id: 'map', label: t('worldApp.tabMap'), icon: MapIcon },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
          <Globe className="w-6 h-6" style={{ color: 'var(--color-accent-violet)' }} />
          {t('worldApp.title')}
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
          {t('worldApp.subtitle')}
        </p>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto" style={{ borderColor: 'var(--color-paper-lines)' }}>
        {tabs.map((item) => {
          const Icon = item.icon
          const isActive = tab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap"
              style={{
                color: isActive ? 'var(--color-accent)' : 'var(--color-ink-light)',
                borderColor: isActive ? 'var(--color-accent)' : 'transparent',
              }}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          )
        })}
      </div>

      {tab === 'lore' && <LoreSection projectId={projectId} />}
      {tab === 'races' && <RacesSection projectId={projectId} />}
      {tab === 'glossary' && <GlossarySection projectId={projectId} />}
      {tab === 'creatures' && <CreaturesSection projectId={projectId} />}
      {tab === 'map' && <WorldMap projectId={projectId} />}
    </div>
  )
}
