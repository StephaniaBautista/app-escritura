import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Ban, RotateCcw, Trash2, CalendarX2 } from 'lucide-react'
import { adminApi, type AdminUser, type Role, type UserStatus } from '@/services/admin'
import { useAuthStore } from '@/stores/auth-store'
import { useToastStore } from '@/stores/toast-store'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type StatusBadge = { label: string; color: string; background: string }

const SUSPEND_PRESETS: { labelKey: string; ms: number }[] = [
  { labelKey: 'admin.users.suspend.24h', ms: 24 * 60 * 60 * 1000 },
  { labelKey: 'admin.users.suspend.7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { labelKey: 'admin.users.suspend.30d', ms: 30 * 24 * 60 * 60 * 1000 },
]

export function UsersSection() {
  const { t } = useTranslation()
  const toast = useToastStore()
  const currentUser = useAuthStore((s) => s.user)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null)
  const [suspendUntil, setSuspendUntil] = useState<number | ''>(SUSPEND_PRESETS[1].ms)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null)

  const load = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([adminApi.listUsers(), adminApi.listRoles()])
      setUsers(usersRes)
      setRoles(rolesRes)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  const protectedRoleNames = roles.filter((r) => r.permissions.includes('admin')).map((r) => r.name)

  const isProtected = (u: AdminUser) => u.id === currentUser?.id || protectedRoleNames.includes(u.role)

  const handleAssign = async (userId: string, role: string) => {
    setBusyId(userId)
    try {
      await adminApi.assignRole(userId, role)
      toast.success(t('admin.users.roleAssigned'))
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusyId(null)
    }
  }

  const handleSetStatus = async (user: AdminUser, status: UserStatus, until?: string | null) => {
    setBusyId(user.id)
    try {
      await adminApi.setUserStatus(user.id, status, until ?? undefined)
      toast.success(t('admin.users.statusUpdated'))
      setSuspendTarget(null)
      setBanTarget(null)
      setSuspendUntil(SUSPEND_PRESETS[1].ms)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    try {
      await adminApi.deleteUser(deleteTarget.id)
      toast.success(t('admin.users.deleted'))
      setDeleteTarget(null)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusyId(null)
    }
  }

  const confirmSuspend = () => {
    if (!suspendTarget) return
    const until = new Date(Date.now() + (suspendUntil === '' ? 7 * 24 * 60 * 60 * 1000 : suspendUntil)).toISOString()
    handleSetStatus(suspendTarget, 'suspended', until)
  }

  const badgeFor = (status: UserStatus): StatusBadge => {
    if (status === 'banned') return { label: t('admin.users.status.banned'), color: 'var(--color-accent)', background: 'var(--color-accent-light)' }
    if (status === 'suspended') return { label: t('admin.users.status.suspended'), color: 'var(--color-warning, #b7791f)', background: '#fef3c7' }
    return { label: t('admin.users.status.active'), color: 'var(--color-success, #2f855a)', background: '#f0fff4' }
  }

  return (
    <div>
      <h3 className="font-display text-lg font-bold mb-4" style={{ color: 'var(--color-ink)' }}>
        {t('admin.users.title')}
      </h3>

      <ErrorMessage message={error} />

      {!loading && users.length > 0 && (
        <div className="relative mb-4">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-ink-faint)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('admin.users.searchPlaceholder')}
            aria-label={t('admin.users.searchPlaceholder')}
            className="w-full rounded-lg border pl-8 pr-3 py-2 text-sm"
            style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
          />
        </div>
      )}

      {loading ? (
        <LoadingState label={t('common.loading')} className="notebook-paper" />
      ) : users.length === 0 ? (
        <div className="notebook-paper p-8 text-center">
          <p style={{ color: 'var(--color-ink-faint)' }}>{t('admin.users.noUsers')}</p>
        </div>
      ) : (
        <div className="notebook-paper divide-y" style={{ borderColor: 'var(--color-paper-lines)' }}>
          {(() => {
            const q = query.trim().toLowerCase()
            const filtered = q ? users.filter((u) => (u.name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : users
            if (filtered.length === 0) {
              return (
                <div className="p-8 text-center">
                  <p style={{ color: 'var(--color-ink-faint)' }}>{t('admin.noResults')}</p>
                </div>
              )
            }
            return filtered.map((u) => {
              const badge = badgeFor(u.status)
              const protectedAccount = isProtected(u)
              return (
                <div key={u.id} className="flex items-center gap-3 p-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>
                        {u.name || '—'}
                      </p>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ color: badge.color, background: badge.background }}
                      >
                        {badge.label}
                      </span>
                      {protectedAccount && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                          {t('admin.users.protected')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--color-ink-faint)' }}>
                      {u.email}
                    </p>
                    {u.status === 'suspended' && u.suspendedUntil && (
                      <p className="text-xs mt-0.5" style={{ color: '#b7791f' }}>
                        {t('admin.users.suspendedUntil', { date: new Date(u.suspendedUntil).toLocaleDateString() })}
                      </p>
                    )}
                  </div>

                  <select
                    value={u.role}
                    disabled={busyId === u.id || protectedAccount}
                    onChange={(e) => handleAssign(u.id, e.target.value)}
                    className="rounded-lg border px-3 py-1.5 text-sm"
                    style={{
                      background: 'var(--color-background)',
                      borderColor: 'var(--color-paper-lines)',
                      color: 'var(--color-ink)',
                    }}
                    aria-label={`${t('admin.users.title')} ${u.email}`}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.name}>{r.label}</option>
                    ))}
                  </select>

                  {!protectedAccount && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {u.status === 'active' ? (
                        <>
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() => setSuspendTarget(u)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border hover:opacity-80 disabled:opacity-50"
                            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}
                          >
                            <CalendarX2 className="w-3.5 h-3.5" />
                            {t('admin.users.suspend.short')}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() => setBanTarget(u)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border hover:opacity-80 disabled:opacity-50"
                            style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                          >
                            <Ban className="w-3.5 h-3.5" />
                            {t('admin.users.ban')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => handleSetStatus(u, 'active')}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border hover:opacity-80 disabled:opacity-50"
                          style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {t('admin.users.reactivate')}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => setDeleteTarget(u)}
                        className="p-1.5 rounded-lg hover:opacity-70 disabled:opacity-50"
                        style={{ color: 'var(--color-ink-faint)' }}
                        aria-label={`${t('admin.users.deleteAccount')} ${u.email}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </div>
      )}

      <ConfirmDialog
        isOpen={suspendTarget !== null}
        title={t('admin.users.suspend.title', { name: suspendTarget?.name || suspendTarget?.email || '' })}
        message={t('admin.users.suspend.message')}
        confirmLabel={t('admin.users.suspend.confirm')}
        onConfirm={confirmSuspend}
        onCancel={() => setSuspendTarget(null)}
      >
        <div className="mb-4 space-y-2">
          {SUSPEND_PRESETS.map((p) => (
            <label key={p.labelKey} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-ink)' }}>
              <input
                type="radio"
                checked={suspendUntil === p.ms}
                onChange={() => setSuspendUntil(p.ms)}
                className="accent-current"
              />
              {t(p.labelKey)}
            </label>
          ))}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={banTarget !== null}
        title={t('admin.users.banTitle', { name: banTarget?.name || banTarget?.email || '' })}
        message={t('admin.users.banMessage')}
        confirmLabel={t('admin.users.banConfirm')}
        onConfirm={() => banTarget && handleSetStatus(banTarget, 'banned')}
        onCancel={() => setBanTarget(null)}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('admin.users.deleteTitle', { name: deleteTarget?.name || deleteTarget?.email || '' })}
        message={t('admin.users.deleteMessage')}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
