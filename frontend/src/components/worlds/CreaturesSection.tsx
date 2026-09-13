import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Bug } from 'lucide-react'
import type { Creature, CreatureInput } from '@/types/worldbuilding'
import { useWorldbuildingStore } from '@/stores/worldbuilding-store'
import { useToastStore } from '@/stores/toast-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { WorldFormSheet } from './WorldFormSheet'
import { EMPTY_CREATURE_FORM, CreatureFormFields, type CreatureFormState } from './CreatureFormFields'

function optional(value: string): string | null {
  return value.trim() || null
}

function toForm(creature: Creature): CreatureFormState {
  return {
    id: creature.id,
    name: creature.name,
    species: creature.species ?? '',
    dangerType: creature.dangerType ?? '',
    description: creature.description ?? '',
    imageUrl: creature.imageUrl,
  }
}

export function CreaturesSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const { creatures, loadCreatures, createCreature, updateCreature, uploadCreatureImage, removeCreature } = useWorldbuildingStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CreatureFormState>(EMPTY_CREATURE_FORM)
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
      species: optional(form.species),
      dangerType: form.dangerType || null,
      description: optional(form.description),
    }
    try {
      const saved = form.id
        ? await updateCreature(form.id, data)
        : await createCreature(projectId, data)
      if (!saved) return
      const pendingImage = form.imageUrl?.startsWith('data:') ? form.imageUrl : null
      if (pendingImage) {
        const withImage = await uploadCreatureImage(saved.id, pendingImage)
        if (!withImage) return
      }
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
          onClick={() => { setForm(EMPTY_CREATURE_FORM); setOpen(true) }}
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
                <div className="flex min-w-0 gap-3">
                  {creature.imageUrl && (
                    <img
                      src={creature.imageUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded object-cover border"
                      style={{ borderColor: 'var(--color-paper-lines)' }}
                    />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold" style={{ color: 'var(--color-ink)' }}>{creature.name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                      {[creature.species, creature.dangerType && t(`worldApp.danger.${creature.dangerType}`)].filter(Boolean).join(' · ') || t('worldApp.creaturesSubtitle')}
                    </p>
                    {creature.description && (
                      <p className="text-sm mt-1.5 whitespace-pre-wrap" style={{ color: 'var(--color-ink-light)' }}>{creature.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={() => { setForm(toForm(creature)); setOpen(true) }}
                    aria-label={t('common.edit')}
                    className="rounded p-1 hover:opacity-70"
                    style={{ color: 'var(--color-ink-light)' }}
                  >
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
        <WorldFormSheet
          variant="creature"
          eyebrow={t('worldApp.creatureSheetLabel')}
          isSaving={isSaving}
          onClose={() => setOpen(false)}
          onSave={() => void handleSave()}
        >
          <CreatureFormFields
            form={form}
            onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
            isSaving={isSaving}
          />
        </WorldFormSheet>
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
