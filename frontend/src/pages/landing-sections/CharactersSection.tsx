import { useTranslation } from 'react-i18next'
import { Users, Star, Lightbulb } from 'lucide-react'
import { SectionHeader, NotebookPaper, useScrollReveal } from '@/components/landing'

export function CharactersSection() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const character = {
    name: t('characters.name'),
    role: t('characters.role'),
    age: '24',
    traits: [t('characters.trait1'), t('characters.trait2'), t('characters.trait3')],
    motivation: t('characters.motivationText'),
    weakness: t('characters.weaknessText'),
  }

  return (
    <section className="py-20 px-6" style={{ background: 'var(--color-paper)' }} ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('characters.tag')}
          title={t('characters.title')}
          description={t('characters.description')}
        />

        <div className="grid md:grid-cols-2 gap-8">
          <NotebookPaper className="p-6 scroll-reveal-left hover-lift">
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-20 h-24 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-accent-light)', border: '2px dashed var(--color-accent)' }}
              >
                <Users className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>{character.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>{character.role}</span>
                  <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>{t('characters.age')}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--color-ink-faint)' }}>{t('characters.traits')}</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {character.traits.map((tr) => (
                    <span key={tr} className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-background)', color: 'var(--color-ink)' }}>{tr}</span>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--color-ink-faint)' }}>{t('characters.motivation')}</span>
                <p className="mt-1" style={{ color: 'var(--color-ink)' }}>{character.motivation}</p>
              </div>
              <div>
                <span className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--color-ink-faint)' }}>{t('characters.weakness')}</span>
                <p className="mt-1" style={{ color: 'var(--color-ink)' }}>{character.weakness}</p>
              </div>
            </div>
          </NotebookPaper>

          <div className="space-y-4 scroll-reveal-right">
            {[
              { icon: Users, title: t('characters.familyTree'), desc: t('characters.familyTreeDesc') },
              { icon: Star, title: t('characters.evolution'), desc: t('characters.evolutionDesc') },
              { icon: Lightbulb, title: t('characters.aiComplete'), desc: t('characters.aiCompleteDesc') },
            ].map((item, i) => (
              <div key={i} className="p-5 rounded border transition-all hover-lift card-click" style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <item.icon className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                  <h4 className="font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>{item.title}</h4>
                </div>
                <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
