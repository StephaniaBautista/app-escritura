import { useTranslation } from 'react-i18next'
import { SectionHeader, NotebookPaper, useScrollReveal } from '@/components/landing'

export function StructureSection() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const columns = [
    { name: t('structure.start'), cards: [t('structure.startCard1'), t('structure.startCard2')] },
    { name: t('structure.development'), cards: [t('structure.devCard1'), t('structure.devCard2')] },
    { name: t('structure.climax'), cards: [t('structure.climaxCard')] },
    { name: t('structure.conclusion'), cards: [] },
  ]

  return (
    <section className="py-20 px-6" style={{ background: 'var(--color-paper)' }} ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('structure.tag')}
          title={t('structure.title')}
          description={t('structure.description')}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {columns.map((col, i) => (
            <div key={i} className="rounded border p-3 scroll-reveal" style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', transitionDelay: `${i * 100}ms` }}>
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider mb-3 px-1" style={{ color: 'var(--color-ink)' }}>{col.name}</h4>
              <div className="space-y-2">
                {col.cards.map((card, j) => (
                  <NotebookPaper key={j} className="p-3 text-sm cursor-grab hover-lift card-click">
                    <div className="font-medium" style={{ color: 'var(--color-ink)' }}>{card}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>{j + 1}</div>
                  </NotebookPaper>
                ))}
                <button
                  className="w-full p-2 rounded border border-dashed text-xs transition-all hover:opacity-80 hover:scale-105"
                  style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-faint)' }}
                >
                  {t('structure.addCard')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
