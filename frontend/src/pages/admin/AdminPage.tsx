import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { ModerationSection } from './sections/ModerationSection'
import { RolesSection } from './sections/RolesSection'
import { UsersSection } from './sections/UsersSection'
import { StoryBankSection } from './sections/StoryBankSection'

type AdminTab = 'moderate' | 'roles' | 'users' | 'structure'

export function AdminPage() {
  const { t } = useTranslation()
  const { permissions } = useAuthStore()
  const [tab, setTab] = useState<AdminTab>('moderate')

  const canAdmin = permissions.includes('admin')
  const canModerate = permissions.includes('moderate') || canAdmin

  const tabs: { id: AdminTab; label: string }[] = [
    ...(canModerate ? [{ id: 'moderate' as AdminTab, label: t('admin.tabs.moderate') }] : []),
    ...(canModerate ? [{ id: 'structure' as AdminTab, label: t('admin.tabs.structure') }] : []),
    ...(canAdmin
      ? [
          { id: 'roles' as AdminTab, label: t('admin.tabs.roles') },
          { id: 'users' as AdminTab, label: t('admin.tabs.users') },
        ]
      : []),
  ]

  const active = tabs.some((tb) => tb.id === tab) ? tab : (tabs[0]?.id ?? 'moderate')

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl">
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-4xl font-bold flex items-center gap-3" style={{ color: 'var(--color-ink)' }}>
            <ShieldCheck className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
            {t('admin.title')}
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-ink-light)' }}>
            {t('admin.subtitle')}
          </p>
        </div>

        <div className="flex gap-1 border-b mb-6 overflow-x-auto" style={{ borderColor: 'var(--color-paper-lines)' }}>
          {tabs.map((tb) => {
            const isActive = active === tb.id
            return (
              <button
                key={tb.id}
                type="button"
                onClick={() => setTab(tb.id)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px"
                style={{
                  color: isActive ? 'var(--color-accent)' : 'var(--color-ink-light)',
                  borderColor: isActive ? 'var(--color-accent)' : 'transparent',
                }}
              >
                {tb.label}
              </button>
            )
          })}
        </div>

        {active === 'moderate' && <ModerationSection />}
        {active === 'structure' && <StoryBankSection />}
        {active === 'roles' && <RolesSection />}
        {active === 'users' && <UsersSection />}
      </div>
    </div>
  )
}
