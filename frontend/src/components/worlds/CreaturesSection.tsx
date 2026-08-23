import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Bug } from 'lucide-react'
import type { Creature, CreatureInput } from '@/types/worldbuilding'
import { useWorldbuildingStore } from '@/stores/worldbuilding-store'
import { useToastStore } from '@/stores/toast-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SectionModal } from './SectionModal'

const DANGER_TYPES = ['none', 'low', 'medium', 'high', 'lethal']

interface FormState {
  id: string | null
  name: string
  species: string
  dangerType: string
  description: string
}

const EMPTY: FormState = { id: null, name: '', species: '', dangerType: '', description: '' }

const inputStyle = {
  background: 'var(--color-background)',
  borderColor: 'var(--color-paper-lines)',
  color: 'var(--color-ink)',
} as const

export function CreaturesSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const { creatures, loadCreatures, createCreature, updateCreature, removeCreature } = useWorldbuildingStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Creature | null>(null)

  useEffect(() => {
    loadCreatures(projectId)
  }, [projectId, loadCreatures])

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error(t('worldApp.nameRequired'))
      return
    }
    setIsSaving(true)
    const data: CreatureInput = {
      name: form.name.trim(),
      species: form.species.trim() || null,
      dangerType: form.dangerType || null,
      description: form.description.trim() || null,
    }
    try {
      if (form.id) await updateCreature(form.id, data)
      else await createCreature(projectId, data)
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
          {t('worldApp.creaturesSubtitle')} · {creatures.length}
        </p>
        <button
          onClick={() => { setForm(EMPTY); setOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus className="w-4 h-4" />
          {t('worldApp.newCreature')}
        </button>
      </div>

      {creatures.length === 0 ? (
        <div className="notebook-paper p-10 text-center">
          <Bug className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-accent-violet)' }} />
          <p className="font-display text-lg" style={{ color: 'var(--color-ink-light)' }}>{t('worldApp.creaturesEmpty')}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {creatures.map((creature) => (
            <div key={creature.id} className="notebook-paper p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold" style={{ color: 'var(--color-ink)' }}>{creature.name}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                    {[creature.species, creature.dangerType && t(`worldApp.danger.${creature.dangerType}`)].filter(Boolean).join(' · ') || t('worldApp.creaturesSubtitle')}
                  </p>
                  {creature.description && (
                    <p className="text-sm mt-1.5 whitespace-pre-wrap" style={{ color: 'var(--color-ink-light)' }}>{creature.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button onClick={() => { setForm({ id: creature.id, name: creature.name, species: creature.species ?? '', dangerType: creature.dangerType ?? '', description: creature.description ?? '' }); setOpen(true) }} aria-label={t('common.edit')} className="rounded p-1 hover:opacity-70" style={{ color: 'var(--color-ink-light)' }}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(creature)} aria-label={t('common.delete')} className="rounded p-1 hover:opacity-70" style={{ color: 'var(--color-danger, #dc2626)' }}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <SectionModal title={form.id ? t('common.edit') : t('worldApp.newCreature')} isSaving={isSaving} onClose={() => setOpen(false)} onSave={handleSave}>
          <div>
            <label htmlFor="cr-name" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.name')}</label>
            <input id="cr-name" type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="cr-species" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.species')}</label>
            <input id="cr-species" type="text" value={form.species} onChange={(e) => setForm((f) => ({ ...f, species: e.target.value }))} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="cr-danger" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.dangerLabel')}</label>
            <select id="cr-danger" value={form.dangerType} onChange={(e) => setForm((f) => ({ ...f, dangerType: e.target.value }))} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
              <option value="">—</option>
              {DANGER_TYPES.map((d) => (
                <option key={d} value={d}>{t(`worldApp.danger.${d}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cr-description" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.description')}</label>
            <textarea id="cr-description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm resize-y" style={inputStyle} />
          </div>
        </SectionModal>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('worldApp.deleteTitle')}
        message={`${t('worldApp.confirmDelete')} ${deleteTarget?.name ?? ''}`}
        confirmLabel={t('common.delete')}
        onConfirm={() => { if (deleteTarget) removeCreature(deleteTarget.id); setDeleteTarget(null) }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
