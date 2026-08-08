import { Link, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  Home, FileText, Clock, Users2, LogOut, Sparkles, PanelLeftClose, PanelLeftOpen, ShieldCheck
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'

interface AppSidebarProps {
  collapsed: boolean
  onToggle: () => void
  onMobileClose?: () => void
}

export function AppSidebar({ collapsed, onToggle, onMobileClose }: AppSidebarProps) {
  const { user, permissions, logout } = useAuthStore()
  const location = useLocation()
  const { t } = useTranslation()

  const mainNav = [
    { path: '/app', label: t('sidebar.home'), icon: Home },
    { path: '/app/documents', label: t('sidebar.myProjects'), icon: FileText },
  ]

  const secondaryNav = [
    { path: '/app/recent', label: t('sidebar.recent'), icon: Clock },
    { path: '/app/shared', label: t('sidebar.shared'), icon: Users2 },
    ...(permissions.includes('admin')
      ? [{ path: '/app/admin', label: t('admin.title'), icon: ShieldCheck }]
      : []),
  ]

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app'
    return location.pathname.startsWith(path)
  }

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-64'} h-screen flex flex-col border-r flex-shrink-0 transition-all duration-200`}
      style={{
        background: 'var(--color-paper)',
        borderColor: 'var(--color-paper-lines)',
      }}
    >
      {/* Header */}
      <div
        className={`${collapsed ? 'p-2 justify-center' : 'p-4'} border-b flex items-center gap-2`}
        style={{ borderColor: 'var(--color-paper-lines)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--color-accent)' }}
        >
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span
            className="font-display font-semibold text-lg flex-1"
            style={{ color: 'var(--color-ink)' }}
          >
            Archivum
          </span>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg transition-all hover:opacity-80"
          style={{ color: 'var(--color-ink-faint)' }}
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 ${collapsed ? 'p-1' : 'p-2'} space-y-1 overflow-y-auto`}>
        {/* Main nav */}
        {mainNav.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${collapsed ? 'px-2' : 'px-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-80`}
              style={
                active
                  ? { background: 'var(--color-accent)', color: 'white' }
                  : { color: 'var(--color-ink-light)' }
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
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
              onClick={onMobileClose}
              className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${collapsed ? 'px-2' : 'px-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-80`}
              style={
                active
                  ? { background: 'var(--color-accent)', color: 'white' }
                  : { color: 'var(--color-ink-light)' }
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div
        className={`${collapsed ? 'p-2' : 'p-3'} border-t`}
        style={{ borderColor: 'var(--color-paper-lines)' }}
      >
        {collapsed ? (
          <div className="flex justify-center">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-accent-light)' }}
              title={user?.name || 'Usuario'}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--color-accent)' }}
              >
                {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
              </span>
            </div>
          </div>
        ) : (
          <>
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
              <span>{t('sidebar.logout')}</span>
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
