import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { sharingApi, type SharedWithMeItem } from '@/services/sharing'

export function SharedPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<SharedWithMeItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    sharingApi.listSharedWithMe()
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  return (
    <div className="p-6 md:p-8">
      <div>
        <h1 className="font-display text-4xl font-bold mb-6" style={{ color: 'var(--color-ink)' }}>
          {t('sharingApp.sharedWithMeTitle')}
        </h1>
        <ErrorMessage message={error} />
        {items.length === 0 ? (
          <div className="notebook-paper p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-accent-teal)' }} />
            <p className="text-sm mt-1" style={{ color: 'var(--color-ink-faint)' }}>
              {t('sharingApp.sharedWithMeEmpty')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Link
                key={item.token}
                to={`/shared/${item.token}`}
                className="notebook-paper p-4 block transition-opacity hover:opacity-80"
              >
                <h3 className="font-display text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
                  {item.title}
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--color-ink-light)' }}>
                  {t('sharingApp.sharedBy', { owner: item.ownerName })}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>
                  {t('sharingApp.lastViewed', { date: new Date(item.lastViewedAt).toLocaleDateString() })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
