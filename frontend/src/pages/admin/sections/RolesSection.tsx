import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, X, Save, Pencil, Search } from 'lucide-react'
import { adminApi, ALL_PERMISSIONS, type Role } from '@/services/admin'
import { useToastStore } from '@/stores/toast-store'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function RolesSection() {
  const { t } = useTranslation()
  const toast = useToastStore()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [perms, setPerms] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editPerms, setEditPerms] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [query, setQuery] = useState('')

  const load = async () => {
    try {
      const res = await adminApi.listRoles()
      setRoles(res)
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

  const togglePerm = (perm: string, current: string[], setter: (v: string[]) => void) => {
    setter(current.includes(perm) ? current.filter((p) => p !== perm) : [...current, perm])
  }

  const handleCreate = async () => {
    if (!name.trim() || !label.trim()) return
    setBusy(true)
    try {
      await adminApi.createRole({
        name: name.trim().toLowerCase(),
        label: label.trim(),
        permissions: perms,
      })
      toast.success(t('admin.roles.created'))
      setShowCreate(false)
      setName('')
      setLabel('')
      setPerms([])
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const handleUpdate = async (id: string) => {
    setBusy(true)
    try {
      await adminApi.updateRole(id, { label: editLabel, permissions: editPerms })
      toast.success(t('admin.roles.updated'))
      setEditingId(null)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await adminApi.deleteRole(deleteTarget.id)
      toast.success(t('admin.roles.deleted'))
      setDeleteTarget(null)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const permChips = (current: string[], setter: (v: string[]) => void) => (
    <div className="flex flex-wrap gap-1.5">
      {ALL_PERMISSIONS.map((perm) => {
        const active = current.includes(perm)
        return (
          <button
            key={perm}
            type="button"
            onClick={() => togglePerm(perm, current, setter)}
            className="px-2 py-1 rounded-full text-xs font-medium border transition-colors"
            style={{
              borderColor: active ? 'var(--color-accent)' : 'var(--color-paper-lines)',
              background: active ? 'var(--color-accent-light)' : 'transparent',
              color: active ? 'var(--color-accent)' : 'var(--color-ink-light)',
            }}
            aria-pressed={active}
          >
            {t(`admin.permissions.${perm}`)}
          </button>
        )
      })}
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
          {t('admin.roles.title')}
        </h3>
        <button
          type="button"
          onClick={() => setShowCreate((s) => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus className="w-4 h-4" />
          {t('admin.roles.create')}
        </button>
      </div>

      <ErrorMessage message={error} />

      {!loading && roles.length > 0 && (
        <div className="relative mb-4">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-ink-faint)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('admin.roles.searchPlaceholder')}
            aria-label={t('admin.roles.searchPlaceholder')}
            className="w-full rounded-lg border pl-8 pr-3 py-2 text-sm"
            style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
          />
        </div>
      )}

      {showCreate && (
        <div className="notebook-paper p-4 mb-4 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('admin.roles.name')}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('admin.roles.label')}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
          />
          <div>
            <p className="text-xs mb-1.5" style={{ color: 'var(--color-ink-light)' }}>{t('admin.roles.permissions')}</p>
            {permChips(perms, setPerms)}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowCreate(false); setName(''); setLabel(''); setPerms([]) }}
              className="px-3 py-1.5 rounded-lg text-sm border hover:opacity-80"
              style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}
              aria-label={t('common.cancel')}
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={busy || !name.trim() || !label.trim()}
              onClick={handleCreate}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--color-accent)' }}
              aria-label={t('common.add')}
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState label={t('common.loading')} className="notebook-paper" />
      ) : (
        <div className="space-y-2">
          {(() => {
            const q = query.trim().toLowerCase()
            const filtered = q ? roles.filter((r) => r.label.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)) : roles
            if (filtered.length === 0) {
              return (
                <div className="notebook-paper p-8 text-center">
                  <p style={{ color: 'var(--color-ink-faint)' }}>{t('admin.noResults')}</p>
                </div>
              )
            }
            return filtered.map((role) => {
            const editing = editingId === role.id
            return (
              <div key={role.id} className="notebook-paper p-4">
                {editing ? (
                  <div className="space-y-3">
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
                    />
                    {permChips(editPerms, setEditPerms)}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-lg text-sm border hover:opacity-80"
                        style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}
                        aria-label={t('common.cancel')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleUpdate(role.id)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                        style={{ background: 'var(--color-accent)' }}
                        aria-label={t('common.confirm')}
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm" style={{ color: 'var(--color-ink)' }}>
                        {role.label}
                        <span className="ml-2 text-xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>{role.name}</span>
                        {role.isSystem && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                            {t('admin.roles.system')}
                          </span>
                        )}
                      </p>
                      <p className="text-xs mt-1 flex flex-wrap gap-1">
                        {role.permissions.map((p) => (
                          <span key={p} className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                            {t(`admin.permissions.${p}`)}
                          </span>
                        ))}
                        <span style={{ color: 'var(--color-ink-faint)' }}>
                          {t('admin.roles.usersCount', { count: role.userCount })}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setEditingId(role.id); setEditLabel(role.label); setEditPerms(role.permissions) }}
                      className="p-2 rounded-lg border hover:opacity-80"
                      style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}
                      aria-label={t('admin.roles.edit')}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {!role.isSystem && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(role)}
                        className="p-2 rounded-lg border hover:opacity-80"
                        style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-accent)' }}
                        aria-label={t('admin.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
            })
          })()}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('admin.roles.deleteTitle')}
        message={t('admin.roles.deleteConfirm')}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
