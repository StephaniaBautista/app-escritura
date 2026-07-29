import { useTranslation } from 'react-i18next'
import { SectionHeader, NotebookPaper, useScrollReveal } from '@/components/landing'

export function TimelineSection() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const events = [
    { time: t('timeline.morning'), title: t('timeline.morningEvent'), characters: ['María', 'Padre'] },
    { time: t('timeline.noon'), title: t('timeline.noonEvent'), characters: ['María', 'Desconocido'] },
    { time: t('timeline.afternoon'), title: t('timeline.afternoonEvent'), characters: ['María', 'Elena'] },
    { time: t('timeline.night'), title: t('timeline.nightEvent'), characters: ['María'] },
  ]

  return (
    <section className="py-20 px-6" ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('timeline.tag')}
          title={t('timeline.title')}
          description={t('timeline.description')}
        />

        <NotebookPaper className="p-8 scroll-reveal-scale">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5" style={{ background: 'var(--color-paper-lines)' }}></div>
            <div className="space-y-8">
              {events.map((e, i) => (
                <div key={i} className="relative pl-12 scroll-reveal" style={{ transitionDelay: `${i * 150}ms` }}>
                  <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full border-2" style={{ borderColor: 'var(--color-accent)', background: 'var(--color-paper)' }}></div>
                  <div className="text-xs font-mono mb-1" style={{ color: 'var(--color-accent)' }}>{e.time}</div>
                  <h4 className="font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>{e.title}</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {e.characters.map((c) => (
                      <span key={c} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>{c}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </NotebookPaper>
      </div>
    </section>
  )
}
