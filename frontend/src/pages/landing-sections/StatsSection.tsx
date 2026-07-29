import { useTranslation } from 'react-i18next'
import { SectionHeader, ContributionGraph, useScrollReveal } from '@/components/landing'

export function StatsSection() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  return (
    <section className="py-20 px-6" ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('stats.tag')}
          title={t('stats.title')}
          description={t('stats.description')}
        />

        <ContributionGraph totalWords={12847} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 scroll-reveal">
          {[
            { value: '12,847', label: t('stats.totalWords') },
            { value: '14', label: t('stats.streak') },
            { value: '918', label: t('stats.average') },
            { value: '23h', label: t('stats.totalTime') },
          ].map((stat, i) => (
            <div key={i} className="text-center p-4 rounded border" style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}>
              <div className="font-display text-3xl font-bold" style={{ color: 'var(--color-ink)' }}>{stat.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
