import { useEffect } from 'react'
import { Link } from 'react-router'
import { useActivityStore } from '@/stores/activity-store'
import { getActivityIcon, getActivityLabel, getActivityLink } from '@/lib/activity-helpers'
import { Clock } from 'lucide-react'

export function RecentPage() {
  const { activities, loadActivities } = useActivityStore()

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  return (
    <div className="p-6 md:p-8">
      <div>
        <h1 className="font-display text-4xl font-bold mb-6" style={{ color: 'var(--color-ink)' }}>Recientes</h1>
        {activities.length > 0 ? (
          <div className="space-y-2">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type)
              return (
                <Link
                  key={activity.id}
                  to={getActivityLink(activity)}
                  className="notebook-paper p-4 flex items-center gap-3 hover:shadow-md transition-all"
                >
                  <Icon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate" style={{ color: 'var(--color-ink)' }}>{activity.title}</h3>
                    <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                      {getActivityLabel(activity.type)}
                    </p>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }}>
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="notebook-paper p-8 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-ink-faint)' }} />
            <p className="font-display text-lg" style={{ color: 'var(--color-ink-light)' }}>No hay actividad reciente</p>
          </div>
        )}
      </div>
    </div>
  )
}
