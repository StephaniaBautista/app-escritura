import { useTranslation } from 'react-i18next'
import { FileText, ScrollText, Share2, Globe } from 'lucide-react'
import { SectionHeader, NotebookPaper, useScrollReveal } from '@/components/landing'

export function ExportSection() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const formats = [
    { icon: FileText, name: t('exportSection.pdf'), desc: t('exportSection.pdfDesc') },
    { icon: ScrollText, name: t('exportSection.markdown'), desc: t('exportSection.markdownDesc') },
    { icon: Globe, name: t('exportSection.html'), desc: t('exportSection.htmlDesc') },
    { icon: Share2, name: t('exportSection.ao3'), desc: t('exportSection.ao3Desc') },
  ]

  return (
    <section className="py-20 px-6" style={{ background: 'var(--color-paper)' }} ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('exportSection.tag')}
          title={t('exportSection.title')}
          description={t('exportSection.description')}
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {formats.map((f, i) => (
            <NotebookPaper key={i} className="p-5 text-center transition-all hover-lift scroll-reveal" style={{ transitionDelay: `${i * 100}ms` }}>
              <div
                className="w-12 h-12 rounded flex items-center justify-center mx-auto mb-3 transition-transform hover:scale-110 hover:rotate-6"
                style={{ background: 'var(--color-accent-light)' }}
              >
                <f.icon className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
              </div>
              <h3 className="font-display text-lg font-bold mb-1" style={{ color: 'var(--color-ink)' }}>{f.name}</h3>
              <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>{f.desc}</p>
            </NotebookPaper>
          ))}
        </div>
      </div>
    </section>
  )
}
