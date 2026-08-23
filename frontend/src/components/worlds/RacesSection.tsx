import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import type { Race, RaceInput } from '@/types/worldbuilding'
import { useWorldbuildingStore } from '@/stores/worldbuilding-store'
import { useToastStore } from '@/stores/toast-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SectionModal } from './SectionModal'

interface FormState {
  id: string | null
  name: string
  classification: string
  description: string
  physicalTraits: string
  hasMagic: boolean
  magicDescription: string
  lifeExpectancy: string
  language: string
  culture: string
  religion: string
  origin: string
  territory: string
}

const EMPTY: FormState = {
  id: null, name: '', classification: '', description: '', physicalTraits: '',
  hasMagic: false, magicDescription: '', lifeExpectancy: '', language: '',
  culture: '', religion: '', origin: '', territory: '',
}

const inputStyle = {
  background: 'var(--color-background)',
  borderColor: 'var(--color-paper-lines)',
  color: 'var(--color-ink)',
} as const

export function RacesSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const { races, loadRaces, createRace, updateRace, removeRace } = useWorldbuildingStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Race | null>(null)

  useEffect(() => {
    loadRaces(projectId)
  }, [projectId, loadRaces])

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error(t('worldApp.nameRequired'))
      return
    }
    setIsSaving(true)
    const data: RaceInput = {
      name: form.name.trim(),
      classification: form.classification.trim() || null,
      description: form.description.trim() || null,
      physicalTraits: form.physicalTraits.trim() || null,
      hasMagic: form.hasMagic,
      magicDescription: form.magicDescription.trim() || null,
      lifeExpectancy: form.lifeExpectancy ? parseInt(form.lifeExpectancy, 10) : null,
      language: form.language.trim() || null,
      culture: form.culture.trim() || null,
      religion: form.religion.trim() || null,
      origin: form.origin.trim() || null,
      territory: form.territory.trim() || null,
    }
    try {
      if (form.id) await updateRace(form.id, data)
      else await createRace(projectId, data)
      toast.success(t('common.save'))
      setOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const toForm = (race: Race): FormState => ({
    id: race.id, name: race.name, classification: race.classification ?? '', description: race.description ?? '',
    physicalTraits: race.physicalTraits ?? '', hasMagic: race.hasMagic, magicDescription: race.magicDescription ?? '',
    lifeExpectancy: race.lifeExpectancy?.toString() ?? '', language: race.language ?? '', culture: race.culture ?? '',
    religion: race.religion ?? '', origin: race.origin ?? '', territory: race.territory ?? '',
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
          {t('worldApp.racesSubtitle')} · {races.length}
        </p>
        <button
          onClick={() => { setForm(EMPTY); setOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus className="w-4 h-4" />
          {t('worldApp.newRace')}
        </button>
      </div>

      {races.length === 0 ? (
        <div className="notebook-paper p-10 text-center">
          <Users className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-accent-violet)' }} />
          <p className="font-display text-lg" style={{ color: 'var(--color-ink-light)' }}>{t('worldApp.racesEmpty')}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {races.map((race) => (
            <div key={race.id} className="notebook-paper p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
                    {race.name}
                    {race.hasMagic && (
                      <span className="ml-2 text-xs font-medium" style={{ color: 'var(--color-accent-violet)' }}>✦</span>
                    )}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                    {[race.classification, race.language, race.territory].filter(Boolean).join(' · ')}
                  </p>
                  {race.description && (
                    <p className="text-sm mt-1.5 whitespace-pre-wrap" style={{ color: 'var(--color-ink-light)' }}>{race.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button onClick={() => { setForm(toForm(race)); setOpen(true) }} aria-label={t('common.edit')} className="rounded p-1 hover:opacity-70" style={{ color: 'var(--color-ink-light)' }}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(race)} aria-label={t('common.delete')} className="rounded p-1 hover:opacity-70" style={{ color: 'var(--color-danger, #dc2626)' }}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <SectionModal title={form.id ? t('common.edit') : t('worldApp.newRace')} isSaving={isSaving} onClose={() => setOpen(false)} onSave={handleSave}>
          <div>
            <label htmlFor="race-name" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.name')}</label>
            <input id="race-name" type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="race-classification" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.classification')}</label>
              <input id="race-classification" type="text" value={form.classification} onChange={(e) => setForm((f) => ({ ...f, classification: e.target.value }))} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="race-language" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.language')}</label>
              <input id="race-language" type="text" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="race-life" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.lifeExpectancy')}</label>
              <input id="race-life" type="number" min={0} value={form.lifeExpectancy} onChange={(e) => setForm((f) => ({ ...f, lifeExpectancy: e.target.value }))} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="race-territory" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.territory')}</label>
              <input id="race-territory" type="text" value={form.territory} onChange={(e) => setForm((f) => ({ ...f, territory: e.target.value }))} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
            </div>
          </div>
          <div>
            <label htmlFor="race-description" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.description')}</label>
            <textarea id="race-description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm resize-y" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="race-traits" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.physicalTraits')}</label>
            <textarea id="race-traits" value={form.physicalTraits} onChange={(e) => setForm((f) => ({ ...f, physicalTraits: e.target.value }))} rows={2} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm resize-y" style={inputStyle} />
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
            <label className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
              <input type="checkbox" checked={form.hasMagic} onChange={(e) => setForm((f) => ({ ...f, hasMagic: e.target.checked }))} disabled={isSaving} />
              {t('worldApp.hasMagic')}
            </label>
            {form.hasMagic && (
              <textarea
                value={form.magicDescription}
                onChange={(e) => setForm((f) => ({ ...f, magicDescription: e.target.value }))}
                rows={2}
                disabled={isSaving}
                placeholder={t('worldApp.magicDescription')}
                className="w-full rounded-lg border px-3 py-2 text-sm resize-y mt-3"
                style={inputStyle}
              />
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="race-culture" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.culture')}</label>
              <textarea id="race-culture" value={form.culture} onChange={(e) => setForm((f) => ({ ...f, culture: e.target.value }))} rows={2} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm resize-y" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="race-religion" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.religion')}</label>
              <textarea id="race-religion" value={form.religion} onChange={(e) => setForm((f) => ({ ...f, religion: e.target.value }))} rows={2} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm resize-y" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="race-origin" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.origin')}</label>
              <textarea id="race-origin" value={form.origin} onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))} rows={2} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm resize-y" style={inputStyle} />
            </div>
          </div>
        </SectionModal>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('worldApp.deleteTitle')}
        message={`${t('worldApp.confirmDelete')} ${deleteTarget?.name ?? ''}`}
        confirmLabel={t('common.delete')}
        onConfirm={() => { if (deleteTarget) removeRace(deleteTarget.id); setDeleteTarget(null) }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
