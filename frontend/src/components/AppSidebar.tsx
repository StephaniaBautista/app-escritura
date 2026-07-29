import { Link, useLocation } from 'react-router-dom'
import {
  Home, FileText, Clock, Users2, LogOut, Sparkles
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'

export function AppSidebar() {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const mainNav = [
    { path: '/app', label: 'Inicio', icon: Home },
    { path: '/app/documents', label: 'Mis proyectos', icon: FileText },
  ]

  const secondaryNav = [
    { path: '/app/recent', label: 'Recientes', icon: Clock },
    { path: '/app/shared', label: 'Compartidos conmigo', icon: Users2 },
  ]

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app'
    return location.pathname.startsWith(path)
  }

  return (
    <aside
      className="w-64 h-screen flex flex-col border-r flex-shrink-0"
      style={{
        background: 'var(--color-paper)',
        borderColor: 'var(--color-paper-lines)',
      }}
    >
      {/* Header */}
      <div
        className="p-4 border-b flex items-center gap-2"
        style={{ borderColor: 'var(--color-paper-lines)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--color-accent)' }}
        >
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span
          className="font-display font-semibold text-lg"
          style={{ color: 'var(--color-ink)' }}
        >
          Escritura
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {/* Main nav */}
        {mainNav.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-80"
              style={
                active
                  ? { background: 'var(--color-accent)', color: 'white' }
                  : { color: 'var(--color-ink-light)' }
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}

        {/* Divider */}
        <div className="h-px my-3" style={{ background: 'var(--color-paper-lines)' }} />

        {/* Secondary nav */}
        {secondaryNav.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-80"
              style={
                active
                  ? { background: 'var(--color-accent)', color: 'white' }
                  : { color: 'var(--color-ink-light)' }
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div
        className="p-3 border-t"
        style={{ borderColor: 'var(--color-paper-lines)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-accent-light)' }}
          >
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--color-accent)' }}
            >
              {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium truncate"
              style={{ color: 'var(--color-ink)' }}
            >
              {user?.name || 'Usuario'}
            </p>
            <p
              className="text-xs truncate"
              style={{ color: 'var(--color-ink-light)' }}
            >
              {user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors hover:opacity-80"
          style={{ color: 'var(--color-ink-light)' }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  )
}
