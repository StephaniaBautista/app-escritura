import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Settings, Moon, Sun, Menu, ArrowLeft } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface TopbarProps {
  onMenuClick?: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [location.pathname])

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark')
    setIsDark(!isDark)
  }

  const isEditor = location.pathname.startsWith('/app/editor')

  const handleBack = () => {
    const segments = location.pathname.split('/').filter(Boolean)
    const projectId = segments[2]
    navigate(projectId ? `/app/documents/${projectId}` : '/app')
  }

  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/app') return 'Inicio'
    if (path === '/app/documents') return 'Documentos'
    if (path.startsWith('/app/editor')) return 'Editor'
    if (path.startsWith('/app/documents/')) return 'Carpeta'
    if (path === '/app/recent') return 'Recientes'
    if (path === '/app/shared') return 'Compartidos'
    if (path === '/app/settings') return t('settings.title')
    return 'Archivum'
  }

  return (
    <header
      className="h-14 border-b flex items-center justify-between px-4"
      style={{
        background: 'var(--color-paper)',
        borderColor: 'var(--color-paper-lines)',
      }}
    >
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:opacity-80 transition-opacity md:hidden"
            style={{ color: 'var(--color-ink-light)' }}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        {isEditor && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ color: 'var(--color-ink-light)' }}
            title={t('common.back')}
            aria-label={t('common.back')}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{t('common.back')}</span>
          </button>
        )}
        <h1
          className="font-display font-semibold text-lg"
          style={{ color: 'var(--color-ink)' }}
        >
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded-lg hover:opacity-80 transition-opacity relative"
          style={{ color: 'var(--color-ink-light)' }}
          title="Notificaciones"
        >
          <Bell className="w-5 h-5" />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: 'var(--color-accent)' }}
          />
        </button>

        <button
          onClick={toggleDark}
          className="p-2 rounded-lg hover:opacity-80 transition-opacity"
          style={{ color: 'var(--color-ink-light)' }}
          title={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <Link
          to="/app/settings"
          className="p-2 rounded-lg hover:opacity-80 transition-opacity"
          style={{ color: 'var(--color-ink-light)' }}
          title="Configuración"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </div>
    </header>
  )
}
