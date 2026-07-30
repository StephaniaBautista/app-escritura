import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useDocumentStore } from '@/stores/document-store'
import { useActivityStore } from '@/stores/activity-store'
import { formatTime } from '@/lib/utils'
import { getActivityIcon, getActivityLabel, getActivityLink } from '@/lib/activity-helpers'
import { QuickAction } from '@/components/ui/QuickAction'
import { FileText, BookOpen, Sparkles } from 'lucide-react'

export function DashboardHome() {
  const { user } = useAuthStore()
  const { activities, loadActivities } = useActivityStore()
  const { quickCreateDocument } = useDocumentStore()
  const navigate = useNavigate()

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  const handleQuickDocument = async () => {
    try {
      const doc = await quickCreateDocument()
      navigate(`/app/editor/${doc.projectId}/${doc.id}`)
    } catch {
      navigate('/app/documents')
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl">
        <div className="notebook-paper p-6 mb-8 relative">
          <div className="notebook-lines absolute inset-0 opacity-20 rounded-xl"></div>
          <div className="relative z-10">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-2" style={{ color: 'var(--color-ink)' }}>
              Bienvenido, {user?.name || 'Escritor'}
            </h1>
            <p className="text-lg" style={{ color: 'var(--color-ink-light)' }}>
              Tu espacio de trabajo creativo
            </p>
          </div>
          <div className="postit absolute -top-3 -right-3 px-3 py-1.5 hidden md:block">
            <span className="font-display text-sm font-bold">¡A escribir!</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <QuickAction
            icon={FileText}
            title="Documento Rápido"
            description="Crea un documento sin proyecto"
            onClick={handleQuickDocument}
            color="accent"
          />
          <QuickAction
            icon={BookOpen}
            title="Nuevo Proyecto"
            description="Crea un proyecto con personajes y mundos"
            href="/app/documents"
            color="teal"
          />
        </div>

        <div className="notebook-paper p-6 relative">
          <div className="notebook-lines absolute inset-0 opacity-15 rounded-xl"></div>
          <div className="relative z-10">
            <h2 className="font-display text-2xl font-bold mb-4" style={{ color: 'var(--color-ink)' }}>
              Actividad reciente
            </h2>
            {activities.length > 0 ? (
              <div className="space-y-3">
                {activities.slice(0, 10).map((activity) => {
                  const Icon = getActivityIcon(activity.type)
                  return (
                    <Link
                      key={activity.id}
                      to={getActivityLink(activity)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:opacity-80 transition-opacity"
                      style={{ background: 'var(--color-background)' }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-accent-light)' }}>
                        <Icon className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>
                          {activity.title}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                          {getActivityLabel(activity.type)}
                        </p>
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }}>
                        {formatTime(activity.timestamp)}
                      </span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-block postit-blue p-4 rounded-lg mb-4">
                  <Sparkles className="w-8 h-8 mx-auto" style={{ color: 'var(--color-accent-teal)' }} />
                </div>
                <p className="font-display text-lg" style={{ color: 'var(--color-ink-light)' }}>
                  No hay actividad reciente
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-ink-faint)' }}>
                  Empieza a crear tu primera historia
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
