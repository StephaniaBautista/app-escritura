import { useTranslation } from 'react-i18next'
import { SectionHeader, NotebookPaper, useScrollReveal } from '@/components/landing'
import { LandingTimelinePreview } from './LandingTimelinePreview'

export function TimelineSection() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  return (
    <section className="py-20 px-6" ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('timeline.tag')}
          title={t('timeline.title')}
          description={t('timeline.description')}
        />

        <NotebookPaper className="scroll-reveal-scale overflow-hidden">
          <LandingTimelinePreview />
        </NotebookPaper>
      </div>
    </section>
  )
}
