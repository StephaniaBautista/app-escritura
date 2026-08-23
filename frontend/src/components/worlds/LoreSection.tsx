import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, ScrollText } from 'lucide-react'
import type { LoreEntry, LoreEntryInput, LoreType } from '@/types/worldbuilding'
import { useWorldbuildingStore } from '@/stores/worldbuilding-store'
import { useToastStore } from '@/stores/toast-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SectionModal } from './SectionModal'

const LORE_TYPES: LoreType[] = ['magic', 'faction', 'religion', 'location', 'item', 'custom']

interface LoreFormState {
  id: string | null
  name: string
  type: LoreType
  description: string
  limits: string
}

const EMPTY: LoreFormState = { id: null, name: '', type: 'custom', description: '', limits: '' }

const inputStyle = {
  background: 'var(--color-background)',
  borderColor: 'var(--color-paper-lines)',
  color: 'var(--color-ink)',
} as const

export function LoreSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const { lore, loadLore, createLore, updateLore, removeLore } = useWorldbuildingStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<LoreFormState>(EMPTY)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LoreEntry | null>(null)

  useEffect(() => {
    loadLore(projectId)
  }, [projectId, loadLore])

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error(t('worldApp.nameRequired'))
      return
    }
    setIsSaving(true)
    const data: LoreEntryInput = {
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim() || null,
      limits: form.limits.trim() || null,
    }
    try {
      if (form.id) await updateLore(form.id, data)
      else await createLore(projectId, data)
      toast.success(t('common.save'))
      setOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
          {t('worldApp.loreSubtitle')} · {lore.length}
        </p>
        <button
          onClick={() => { setForm(EMPTY); setOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus className="w-4 h-4" />
          {t('worldApp.newLore')}
        </button>
      </div>

      {lore.length === 0 ? (
        <div className="notebook-paper p-10 text-center">
          <ScrollText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-accent-violet)' }} />
          <p className="font-display text-lg" style={{ color: 'var(--color-ink-light)' }}>{t('worldApp.loreEmpty')}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lore.map((entry) => (
            <div key={entry.id} className="notebook-paper p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-accent-violet)' }}>
                    {t(`worldApp.loreType.${entry.type}`)}
                  </span>
                  <h3 className="font-display text-base font-semibold" style={{ color: 'var(--color-ink)' }}>{entry.name}</h3>
                  {entry.description && (
                    <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: 'var(--color-ink-light)' }}>{entry.description}</p>
                  )}
                  {entry.limits && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--color-ink-faint)' }}>
                      {t('worldApp.limits')}: {entry.limits}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button onClick={() => { setForm({ id: entry.id, name: entry.name, type: entry.type as LoreType, description: entry.description ?? '', limits: entry.limits ?? '' }); setOpen(true) }} aria-label={t('common.edit')} className="rounded p-1 hover:opacity-70" style={{ color: 'var(--color-ink-light)' }}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(entry)} aria-label={t('common.delete')} className="rounded p-1 hover:opacity-70" style={{ color: 'var(--color-danger, #dc2626)' }}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <SectionModal title={form.id ? t('common.edit') : t('worldApp.newLore')} isSaving={isSaving} onClose={() => setOpen(false)} onSave={handleSave}>
          <div>
            <label htmlFor="lore-name" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.name')}</label>
            <input id="lore-name" type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="lore-type" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.loreTypeLabel')}</label>
            <select id="lore-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as LoreType }))} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
              {LORE_TYPES.map((type) => (
                <option key={type} value={type}>{t(`worldApp.loreType.${type}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lore-description" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.description')}</label>
            <textarea id="lore-description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm resize-y" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="lore-limits" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.limits')}</label>
            <textarea id="lore-limits" value={form.limits} onChange={(e) => setForm((f) => ({ ...f, limits: e.target.value }))} rows={2} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm resize-y" style={inputStyle} />
          </div>
        </SectionModal>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('worldApp.deleteTitle')}
        message={`${t('worldApp.confirmDelete')} ${deleteTarget?.name ?? ''}`}
        confirmLabel={t('common.delete')}
        onConfirm={() => { if (deleteTarget) removeLore(deleteTarget.id); setDeleteTarget(null) }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
