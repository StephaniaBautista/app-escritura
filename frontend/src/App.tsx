import { Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Landing } from '@/pages/Landing'
import { PricingPage } from '@/pages/PricingPage'
import { cn } from '@/lib/utils'
import {
  Home, FileText, Users, Globe, LogOut, Plus, BookOpen, Sparkles
} from 'lucide-react'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="characters" element={<CharactersPage />} />
        <Route path="worlds" element={<WorldsPage />} />
      </Route>
    </Routes>
  )
}

function DashboardLayout() {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const navItems = [
    { path: '/app', label: 'Inicio', icon: Home },
    { path: '/app/documents', label: 'Documentos', icon: FileText },
    { path: '/app/characters', label: 'Personajes', icon: Users },
    { path: '/app/worlds', label: 'Mundos', icon: Globe },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>
      <aside className="w-64 border-r flex flex-col" style={{ background: 'var(--paper)', borderColor: 'var(--paper-lines)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--paper-lines)' }}>
          <Link to="/app" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>Escritura</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  location.pathname === item.path
                    ? 'text-white shadow-md'
                    : 'hover:opacity-80'
                )}
                style={
                  location.pathname === item.path
                    ? { background: 'var(--accent)', color: 'white' }
                    : { color: 'var(--ink-light)' }
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'var(--paper-lines)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                {user?.name || 'Usuario'}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--ink-light)' }}>
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--ink-light)' }}
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesion</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

function DashboardHome() {
  const { user } = useAuthStore()

  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
          Bienvenido, {user?.name || 'Escritor'}
        </h1>
        <p className="mb-8" style={{ color: 'var(--ink-light)' }}>
          Tu espacio de trabajo creativo
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <QuickAction
            icon={FileText}
            title="Nuevo Documento"
            description="Empieza a escribir"
            href="/app/documents"
          />
          <QuickAction
            icon={Users}
            title="Nuevo Personaje"
            description="Crea un personaje"
            href="/app/characters"
          />
          <QuickAction
            icon={Globe}
            title="Nuevo Mundo"
            description="Construye un mundo"
            href="/app/worlds"
          />
        </div>

        <div className="mt-12 p-6 rounded-xl border" style={{ background: 'var(--paper)', borderColor: 'var(--paper-lines)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--ink)' }}>Actividad reciente</h2>
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--ink-light)' }} />
            <p className="text-sm" style={{ color: 'var(--ink-light)' }}>
              No hay actividad reciente. Empieza a crear.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function DocumentsPage() {
  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>Documentos</h1>
            <p style={{ color: 'var(--ink-light)' }}>Gestiona tus escritos</p>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:opacity-90 shadow-md"
            style={{ background: 'var(--accent)' }}
          >
            <Plus className="w-4 h-4" />
            Nuevo Documento
          </button>
        </div>

        <div className="p-12 rounded-xl border text-center" style={{ background: 'var(--paper)', borderColor: 'var(--paper-lines)' }}>
          <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--ink-light)' }} />
          <h3 className="font-semibold mb-2" style={{ color: 'var(--ink)' }}>No hay documentos</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-light)' }}>
            Crea tu primer documento para empezar a escribir
          </p>
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:opacity-90 shadow-md mx-auto"
            style={{ background: 'var(--accent)' }}
          >
            <Plus className="w-4 h-4" />
            Crear Documento
          </button>
        </div>
      </div>
    </div>
  )
}

function CharactersPage() {
  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>Personajes</h1>
            <p style={{ color: 'var(--ink-light)' }}>Crea y gestiona tus personajes</p>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:opacity-90 shadow-md"
            style={{ background: 'var(--accent)' }}
          >
            <Plus className="w-4 h-4" />
            Nuevo Personaje
          </button>
        </div>

        <div className="p-12 rounded-xl border text-center" style={{ background: 'var(--paper)', borderColor: 'var(--paper-lines)' }}>
          <Users className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--ink-light)' }} />
          <h3 className="font-semibold mb-2" style={{ color: 'var(--ink)' }}>No hay personajes</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-light)' }}>
            Crea tu primer personaje para tu historia
          </p>
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:opacity-90 shadow-md mx-auto"
            style={{ background: 'var(--accent)' }}
          >
            <Plus className="w-4 h-4" />
            Crear Personaje
          </button>
        </div>
      </div>
    </div>
  )
}

function WorldsPage() {
  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>Mundos</h1>
            <p style={{ color: 'var(--ink-light)' }}>Construye mundos para tus historias</p>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:opacity-90 shadow-md"
            style={{ background: 'var(--accent)' }}
          >
            <Plus className="w-4 h-4" />
            Nuevo Mundo
          </button>
        </div>

        <div className="p-12 rounded-xl border text-center" style={{ background: 'var(--paper)', borderColor: 'var(--paper-lines)' }}>
          <Globe className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--ink-light)' }} />
          <h3 className="font-semibold mb-2" style={{ color: 'var(--ink)' }}>No hay mundos</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-light)' }}>
            Crea tu primer mundo para ambientar tu historia
          </p>
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:opacity-90 shadow-md mx-auto"
            style={{ background: 'var(--accent)' }}
          >
            <Plus className="w-4 h-4" />
            Crear Mundo
          </button>
        </div>
      </div>
    </div>
  )
}

function QuickAction({ icon: Icon, title, description, href }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; title: string; description: string; href: string }) {
  return (
    <Link
      to={href}
      className="p-6 rounded-xl border hover:shadow-lg transition-all duration-200"
      style={{ background: 'var(--paper)', borderColor: 'var(--paper-lines)' }}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: 'var(--accent-light)' }}>
        <Icon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
      </div>
      <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{title}</h3>
      <p className="text-sm" style={{ color: 'var(--ink-light)' }}>{description}</p>
    </Link>
  )
}

export default App
