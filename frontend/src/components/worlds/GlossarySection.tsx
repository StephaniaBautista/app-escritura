import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react'
import type { GlossaryEntry, GlossaryEntryInput } from '@/types/worldbuilding'
import { useWorldbuildingStore } from '@/stores/worldbuilding-store'
import { useToastStore } from '@/stores/toast-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { WorldFormSheet } from './WorldFormSheet'
import { EMPTY_GLOSSARY_FORM, GlossaryFormFields, type GlossaryFormState } from './GlossaryFormFields'

function toForm(entry: GlossaryEntry): GlossaryFormState {
  return {
    id: entry.id,
    word: entry.word,
    pronunciation: entry.pronunciation ?? '',
    meaning: entry.meaning ?? '',
  }
}

export function GlossarySection({
  projectId,
  importDraft,
}: {
  projectId: string
  importDraft?: { text: string; nonce: number } | null
}) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const { glossary, loadGlossary, createGlossary, updateGlossary, removeGlossary } = useWorldbuildingStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<GlossaryFormState>(EMPTY_GLOSSARY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<GlossaryEntry | null>(null)

  useEffect(() => {
    loadGlossary(projectId)
  }, [projectId, loadGlossary])

  useEffect(() => {
    if (!importDraft?.text) return
    setForm({ ...EMPTY_GLOSSARY_FORM, meaning: importDraft.text })
    setOpen(true)
  }, [importDraft])

  const patchForm = (patch: Partial<GlossaryFormState>) => setForm((current) => ({ ...current, ...patch }))

  const handleSave = async () => {
    if (!form.word.trim()) {
      toast.error(t('worldApp.wordRequired'))
      return
    }
    setIsSaving(true)
    const data: GlossaryEntryInput = {
      word: form.word.trim(),
      pronunciation: form.pronunciation.trim() || null,
      meaning: form.meaning.trim() || null,
    }
    try {
      if (form.id) await updateGlossary(form.id, data)
      else await createGlossary(projectId, data)
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
          {t('worldApp.glossarySubtitle')} · {glossary.length}
        </p>
        <button
          onClick={() => { setForm(EMPTY_GLOSSARY_FORM); setOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus className="w-4 h-4" />
          {t('worldApp.newGlossary')}
        </button>
      </div>

      {glossary.length === 0 ? (
        <div className="notebook-paper p-10 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-accent-violet)' }} />
          <p className="font-display text-lg" style={{ color: 'var(--color-ink-light)' }}>{t('worldApp.glossaryEmpty')}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {glossary.map((entry) => (
            <div key={entry.id} className="notebook-paper p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
                    {entry.word}
                    {entry.pronunciation && (
                      <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-ink-faint)' }}>/ {entry.pronunciation} /</span>
                    )}
                  </h3>
                  {entry.meaning && (
                    <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: 'var(--color-ink-light)' }}>{entry.meaning}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={() => { setForm(toForm(entry)); setOpen(true) }}
                    aria-label={t('common.edit')}
                    className="rounded p-1 hover:opacity-70"
                    style={{ color: 'var(--color-ink-light)' }}
                  >
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
        <WorldFormSheet
          variant="glossary"
          eyebrow={t('worldApp.glossarySheetLabel')}
          isSaving={isSaving}
          onClose={() => setOpen(false)}
          onSave={() => void handleSave()}
        >
          <GlossaryFormFields form={form} onChange={patchForm} isSaving={isSaving} />
        </WorldFormSheet>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('worldApp.deleteTitle')}
        message={`${t('worldApp.confirmDelete')} ${deleteTarget?.word ?? ''}`}
        confirmLabel={t('common.delete')}
        onConfirm={() => { if (deleteTarget) removeGlossary(deleteTarget.id); setDeleteTarget(null) }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
