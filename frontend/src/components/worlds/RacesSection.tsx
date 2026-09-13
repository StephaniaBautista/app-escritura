import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import type { Race, RaceInput } from '@/types/worldbuilding'
import { useWorldbuildingStore } from '@/stores/worldbuilding-store'
import { useToastStore } from '@/stores/toast-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { RaceFormSheet } from './RaceFormSheet'
import { EMPTY_RACE_FORM, RaceFormFields, type RaceFormState } from './RaceFormFields'

function optional(value: string): string | null {
  return value.trim() || null
}

function toForm(race: Race): RaceFormState {
  return {
    id: race.id,
    name: race.name,
    classification: race.classification ?? '',
    description: race.description ?? '',
    physicalTraits: race.physicalTraits ?? '',
    magicDescription: race.magicDescription ?? '',
    spiritualTraits: race.spiritualTraits ?? '',
    lifeExpectancy: race.lifeExpectancy ?? '',
    language: race.language ?? '',
    culture: race.culture ?? '',
    religion: race.religion ?? '',
    origin: race.origin ?? '',
    territory: race.territory ?? '',
    relationsWithOthers: race.relationsWithOthers ?? '',
    importantNotes: race.importantNotes ?? '',
    imageUrl: race.imageUrl,
    pdfUrl: race.pdfUrl,
    pdfName: race.pdfName,
  }
}

export function RacesSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const { races, loadRaces, createRace, updateRace, uploadRaceImage, uploadRacePdf, removeRacePdf, removeRace } = useWorldbuildingStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<RaceFormState>(EMPTY_RACE_FORM)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [clearPdf, setClearPdf] = useState(false)
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
      classification: optional(form.classification),
      description: optional(form.description),
      physicalTraits: optional(form.physicalTraits),
      magicDescription: optional(form.magicDescription),
      spiritualTraits: optional(form.spiritualTraits),
      lifeExpectancy: optional(form.lifeExpectancy),
      language: optional(form.language),
      culture: optional(form.culture),
      religion: optional(form.religion),
      origin: optional(form.origin),
      territory: optional(form.territory),
      relationsWithOthers: optional(form.relationsWithOthers),
      importantNotes: optional(form.importantNotes),
    }
    try {
      const saved = form.id
        ? await updateRace(form.id, data)
        : await createRace(projectId, data)
      if (!saved) return
      const pendingImage = form.imageUrl?.startsWith('data:') ? form.imageUrl : null
      if (pendingImage) {
        const withImage = await uploadRaceImage(saved.id, pendingImage)
        if (!withImage) return
      }
      if (pdfFile) {
        const withPdf = await uploadRacePdf(saved.id, pdfFile)
        if (!withPdf) return
      } else if (clearPdf && saved.pdfUrl) {
        const cleared = await removeRacePdf(saved.id)
        if (!cleared) return
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
          {t('worldApp.racesSubtitle')} · {races.length}
        </p>
        <button
          onClick={() => {
            setForm(EMPTY_RACE_FORM)
            setPdfFile(null)
            setClearPdf(false)
            setOpen(true)
          }}
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
                <div className="flex min-w-0 gap-3">
                  {race.imageUrl && (
                    <img
                      src={race.imageUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg object-cover border"
                      style={{ borderColor: 'var(--color-paper-lines)' }}
                    />
                  )}
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
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={() => {
                      setForm(toForm(race))
                      setPdfFile(null)
                      setClearPdf(false)
                      setOpen(true)
                    }}
                    aria-label={t('common.edit')}
                    className="rounded p-1 hover:opacity-70"
                    style={{ color: 'var(--color-ink-light)' }}
                  >
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
        <RaceFormSheet
          title={form.id ? form.name.trim() || t('common.edit') : t('worldApp.newRace')}
          isSaving={isSaving}
          onClose={() => setOpen(false)}
          onSave={() => void handleSave()}
        >
          <RaceFormFields
            form={form}
            onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
            pdfFile={pdfFile}
            onPdfFile={(file) => { setPdfFile(file); if (file) setClearPdf(false) }}
            onRemovePdf={() => { setPdfFile(null); if (form.pdfUrl) setClearPdf(true); setForm((current) => ({ ...current, pdfName: null, pdfUrl: null })) }}
            isSaving={isSaving}
          />
        </RaceFormSheet>
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
