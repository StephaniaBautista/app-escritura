import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { PostIt, useScrollReveal } from '@/components/landing'

export function CTASection() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  return (
    <section className="py-20 px-6" style={{ background: 'var(--color-paper)' }} ref={sectionRef}>
      <div className="max-w-2xl mx-auto text-center">
        <PostIt variant="yellow" className="inline-block p-6 mb-8 animate-wiggle scroll-reveal">
          <div className="font-display text-lg font-bold">{t('cta.noteTitle')}</div>
          <div className="text-sm mt-1" style={{ color: 'var(--color-ink-light)' }}>{t('cta.noteText')}</div>
        </PostIt>

        <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 scroll-reveal" style={{ color: 'var(--color-ink)' }}>
          {t('cta.title')}
        </h2>
        <p className="mb-8 text-lg scroll-reveal" style={{ color: 'var(--color-ink-light)' }}>
          {t('cta.subtitle')}
        </p>

        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded font-medium transition-all hover:opacity-90 hover:scale-105 hover:shadow-lg shadow-md text-lg card-click scroll-reveal"
          style={{ background: 'var(--color-accent)', color: 'white' }}
        >
          {t('cta.button')}
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </section>
  )
}
