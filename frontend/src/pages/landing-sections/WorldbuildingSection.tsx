import { useTranslation } from 'react-i18next'
import {
  Users, ScrollText, BookOpen, Network,
  Globe, Star
} from 'lucide-react'
import { SectionHeader, FeatureCard, useScrollReveal } from '@/components/landing'

export function WorldbuildingSection() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const items = [
    { icon: Users, title: t('worldbuilding.races'), desc: t('worldbuilding.racesDesc') },
    { icon: ScrollText, title: t('worldbuilding.lore'), desc: t('worldbuilding.loreDesc') },
    { icon: Globe, title: t('worldbuilding.worldmap'), desc: t('worldbuilding.worldmapDesc') },
    { icon: BookOpen, title: t('worldbuilding.glossary'), desc: t('worldbuilding.glossaryDesc') },
    { icon: Star, title: t('worldbuilding.creatures'), desc: t('worldbuilding.creaturesDesc') },
    { icon: Network, title: t('worldbuilding.relations'), desc: t('worldbuilding.relationsDesc') },
  ]

  return (
    <section className="py-20 px-6" style={{ background: 'var(--color-paper)' }} ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('worldbuilding.tag')}
          title={t('worldbuilding.title')}
          description={t('worldbuilding.description')}
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((f, i) => (
            <FeatureCard key={i} icon={f.icon} title={f.title} description={f.desc} delay={i * 80} />
          ))}
        </div>
      </div>
    </section>
  )
}
