import { useTranslation } from 'react-i18next'
import {
  PenLine, GitBranch, Users, Clock, Network,
  ScrollText, Layers, BarChart3,
  FolderTree, Bookmark
} from 'lucide-react'
import { SectionHeader, FeatureCard, useScrollReveal } from '@/components/landing'

export function Features() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const features = [
    { icon: PenLine, title: t('features.editor'), desc: t('features.editorDesc') },
    { icon: FolderTree, title: t('features.chapters'), desc: t('features.chaptersDesc') },
    { icon: Bookmark, title: t('features.notes'), desc: t('features.notesDesc') },
    { icon: GitBranch, title: t('features.git'), desc: t('features.gitDesc') },
    { icon: Users, title: t('features.characters'), desc: t('features.charactersDesc') },
    { icon: Clock, title: t('features.timeline'), desc: t('features.timelineDesc') },
    { icon: Network, title: t('features.relations'), desc: t('features.relationsDesc') },
    { icon: ScrollText, title: t('features.lore'), desc: t('features.loreDesc') },
    { icon: Layers, title: t('features.subplots'), desc: t('features.subplotsDesc') },
    { icon: BarChart3, title: t('features.stats'), desc: t('features.statsDesc') },
  ]

  return (
    <section id="features" className="py-20 px-6" style={{ background: 'var(--color-paper)' }} ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('features.tag')}
          title={t('features.title')}
          description={t('features.description')}
          align="center"
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <FeatureCard key={i} icon={f.icon} title={f.title} description={f.desc} delay={i * 50} />
          ))}
        </div>
      </div>
    </section>
  )
}
