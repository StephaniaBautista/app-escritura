import { Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { NotebookPaper, PostIt } from '@/components/landing'

export function Hero() {
  const { t } = useTranslation()

  return (
    <section className="pt-28 pb-20 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-none mb-6"
              style={{ color: 'var(--color-ink)' }}
            >
              <Trans i18nKey="hero.title">
                Tu historia merece un <span className="pencil-underline">taller</span>, no un bloc de notas
              </Trans>
            </h1>

            <p className="text-lg mb-8 max-w-lg leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
              {t('hero.subtitle')}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded font-medium transition-all hover:opacity-90 hover:scale-105 hover:shadow-lg shadow-md card-click"
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                {t('hero.cta')}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3 rounded font-medium transition-all hover:opacity-80 hover:scale-105 border card-click"
                style={{ color: 'var(--color-ink)', borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)' }}
              >
                {t('hero.ctaSecondary')}
              </a>
            </div>
          </div>

          <div className="relative animate-fade-in-right" style={{ animationDelay: '0.3s', opacity: 0 }}>
            <NotebookPaper spiral className="p-6 animate-paper-flutter" style={{ '--rotate': '1deg' } as React.CSSProperties}>
              <div className="notebook-lines-only min-h-[280px] p-4 font-body text-sm leading-7" style={{ color: 'var(--color-ink)' }}>
                <h3 className="font-display text-2xl font-bold mb-4" style={{ color: 'var(--color-ink)' }}>
                  {t('editor.chapter')}
                </h3>
                <p className="mb-3">{t('editor.text1')}</p>
                <p className="mb-3">{t('editor.text2')}</p>
                <p className="animate-typing" style={{ color: 'var(--color-ink-light)' }}>{t('editor.text3')}</p>
                <div className="mt-4 pt-3 border-t flex items-center gap-2 text-xs" style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-faint)' }}>
                  <span className="highlight-yellow">{t('editor.words')}</span>
                  <span>·</span>
                  <span>{t('editor.saved')}</span>
                </div>
              </div>
            </NotebookPaper>

            <PostIt variant="yellow" className="absolute -bottom-4 -right-4 w-48">
              <div className="font-display text-base font-bold mb-1">Nota rápida</div>
              <div style={{ color: 'var(--color-ink-light)' }}>Recordar: Elena llega tarde al café porque perdió el autobús</div>
            </PostIt>

            <PostIt variant="blue" className="absolute -top-3 -left-3 w-40">
              <div className="font-medium">Rama: final-alternativo</div>
              <div style={{ color: 'var(--color-ink-faint)' }}>3 cambios pendientes</div>
            </PostIt>
          </div>
        </div>
      </div>
    </section>
  )
}
