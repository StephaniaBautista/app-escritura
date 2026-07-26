import { Link, useLocation } from 'react-router-dom'
import { Feather, Menu, XIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'

export function LandingNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const { t } = useTranslation()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '/#features', label: t('nav.features') },
    { href: '/pricing', label: t('nav.pricing') },
    { href: '/#ai', label: t('nav.ai') },
  ]

  function handleNavClick(href: string) {
    setOpen(false)
    if (href.startsWith('/#') && location.pathname === '/') {
      const id = href.replace('/#', '')
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <nav
      className={`fixed top-0 w-full z-50 border-b transition-all duration-300 ${
        scrolled ? 'shadow-sm' : ''
      }`}
      style={{
        background: scrolled
          ? 'color-mix(in srgb, var(--color-background) 95%, transparent)'
          : 'color-mix(in srgb, var(--color-background) 85%, transparent)',
        borderColor: 'var(--color-paper-lines)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div
            className="w-8 h-8 rounded flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ background: 'var(--color-accent)' }}
          >
            <Feather className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-xl font-bold" style={{ color: 'var(--color-ink)' }}>
            Escritura
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            link.href.startsWith('/#') ? (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium hover:opacity-70 transition-opacity relative group"
                style={{ color: 'var(--color-ink-light)' }}
                onClick={(e) => {
                  if (location.pathname === '/') {
                    e.preventDefault()
                    handleNavClick(link.href)
                  }
                }}
              >
                {link.label}
                <span
                  className="absolute -bottom-1 left-0 w-0 h-0.5 transition-all group-hover:w-full"
                  style={{ background: 'var(--color-accent)' }}
                ></span>
              </a>
            ) : (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium hover:opacity-70 transition-opacity relative group"
                style={{ color: 'var(--color-ink-light)' }}
              >
                {link.label}
                <span
                  className="absolute -bottom-1 left-0 w-0 h-0.5 transition-all group-hover:w-full"
                  style={{ background: 'var(--color-accent)' }}
                ></span>
              </Link>
            )
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            to="/login"
            className="text-sm font-medium px-4 py-2 rounded hover:opacity-80 transition-opacity"
            style={{ color: 'var(--color-ink)' }}
          >
            {t('nav.login')}
          </Link>
          <Link
            to="/register"
            className="text-sm font-medium px-4 py-2 rounded text-white transition-all hover:opacity-90 hover:scale-105 shadow-sm"
            style={{ background: 'var(--color-accent)' }}
          >
            {t('nav.signup')}
          </Link>
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? (
            <XIcon className="w-5 h-5" style={{ color: 'var(--color-ink)' }} />
          ) : (
            <Menu className="w-5 h-5" style={{ color: 'var(--color-ink)' }} />
          )}
        </button>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${open ? 'max-h-60' : 'max-h-0'}`}
        style={{ background: 'var(--color-paper)' }}
      >
        <div className="px-6 py-4 space-y-3 border-t" style={{ borderColor: 'var(--color-paper-lines)' }}>
          {navLinks.map((link) => (
            link.href.startsWith('/#') ? (
              <a
                key={link.href}
                href={link.href}
                className="block text-sm font-medium"
                style={{ color: 'var(--color-ink)' }}
                onClick={(e) => {
                  setOpen(false)
                  if (location.pathname === '/') {
                    e.preventDefault()
                    handleNavClick(link.href)
                  }
                }}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                to={link.href}
                className="block text-sm font-medium"
                style={{ color: 'var(--color-ink)' }}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            )
          ))}
          <div className="pt-3 border-t flex flex-col gap-2" style={{ borderColor: 'var(--color-paper-lines)' }}>
            <div className="flex justify-center mb-2">
              <LanguageSwitcher />
            </div>
            <Link
              to="/login"
              className="text-sm font-medium px-4 py-2 rounded text-center"
              style={{ color: 'var(--color-ink)', background: 'var(--color-background)' }}
            >
              {t('nav.login')}
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium px-4 py-2 rounded text-center text-white"
              style={{ background: 'var(--color-accent)' }}
            >
              {t('nav.signup')}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
