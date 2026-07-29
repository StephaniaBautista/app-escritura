import { Link, useLocation } from 'react-router-dom'
import { Bell, Settings, Moon, Sun } from 'lucide-react'
import { useState, useEffect } from 'react'

export function Topbar() {
  const location = useLocation()
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [location.pathname])

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark')
    setIsDark(!isDark)
  }

  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/app') return 'Inicio'
    if (path === '/app/documents') return 'Documentos'
    if (path.startsWith('/app/editor')) return 'Editor'
    if (path.startsWith('/app/documents/')) return 'Carpeta'
    if (path === '/app/recent') return 'Recientes'
    if (path === '/app/shared') return 'Compartidos'
    return 'Escritura'
  }

  return (
    <header
      className="h-14 border-b flex items-center justify-between px-4"
      style={{
        background: 'var(--color-paper)',
        borderColor: 'var(--color-paper-lines)',
      }}
    >
      <h1
        className="font-display font-semibold text-lg"
        style={{ color: 'var(--color-ink)' }}
      >
        {getPageTitle()}
      </h1>

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
          to="/app"
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
