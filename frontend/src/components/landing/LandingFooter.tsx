import { Feather, Shield, Zap, Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

export function LandingFooter() {
  const { t } = useTranslation()
  const location = useLocation()

  function handleNavClick(href: string) {
    if (href.startsWith('/#') && location.pathname === '/') {
      const id = href.replace('/#', '')
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <footer className="border-t py-12 px-6" style={{ borderColor: 'var(--color-paper-lines)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4 group">
              <div
                className="w-8 h-8 rounded flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: 'var(--color-accent)' }}
              >
                <Feather className="w-4 h-4 text-white" />
              </div>
              <span className="font-display text-xl font-bold" style={{ color: 'var(--color-ink)' }}>
                Escritura
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
              {t('footer.description')}
            </p>
          </div>

          {[
            {
              title: t('footer.product'),
              links: [
                { href: '/#features', label: t('footer.functions') },
                { href: '/pricing', label: t('footer.pricing') },
                { href: '/#ai', label: t('footer.ai') },
              ] as { href?: string; label: string }[],
            },
            {
              title: t('footer.resources'),
              links: [
                { label: t('footer.docs') },
                { label: t('footer.guide') },
                { label: t('footer.blog') },
              ] as { href?: string; label: string }[],
            },
            {
              title: t('footer.legal'),
              links: [
                { label: t('footer.privacy') },
                { label: t('footer.terms') },
                { label: t('footer.contact') },
              ] as { href?: string; label: string }[],
            },
          ].map((section) => (
            <div key={section.title}>
              <h4
                className="font-mono text-xs uppercase tracking-wider mb-3"
                style={{ color: 'var(--color-ink)' }}
              >
                {section.title}
              </h4>
              <div className="space-y-2">
                {section.links.map((link) =>
                  link.href ? (
                    link.href.startsWith('/#') ? (
                      <a
                        key={link.label}
                        href={link.href}
                        className="block text-sm hover:opacity-70 transition-all hover:translate-x-1"
                        style={{ color: 'var(--color-ink-light)' }}
                        onClick={(e) => {
                          if (location.pathname === '/') {
                            e.preventDefault()
                            handleNavClick(link.href!)
                          }
                        }}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        key={link.label}
                        to={link.href}
                        className="block text-sm hover:opacity-70 transition-all hover:translate-x-1"
                        style={{ color: 'var(--color-ink-light)' }}
                      >
                        {link.label}
                      </Link>
                    )
                  ) : (
                    <span
                      key={link.label}
                      className="block text-sm"
                      style={{ color: 'var(--color-ink-light)' }}
                    >
                      {link.label}
                    </span>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        <div
          className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderColor: 'var(--color-paper-lines)' }}
        >
          <div className="flex items-center gap-2">
            <Feather className="w-4 h-4" style={{ color: 'var(--color-ink-faint)' }} />
            <span className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
              {t('footer.copyright')}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Shield className="w-4 h-4 transition-transform hover:scale-125" style={{ color: 'var(--color-ink-faint)' }} />
            <Zap className="w-4 h-4 transition-transform hover:scale-125" style={{ color: 'var(--color-ink-faint)' }} />
            <Heart className="w-4 h-4 transition-transform hover:scale-125" style={{ color: 'var(--color-ink-faint)' }} />
          </div>
        </div>
      </div>
    </footer>
  )
}
