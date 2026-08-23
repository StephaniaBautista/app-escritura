import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react'
import type { GlossaryEntry, GlossaryEntryInput } from '@/types/worldbuilding'
import { useWorldbuildingStore } from '@/stores/worldbuilding-store'
import { useToastStore } from '@/stores/toast-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SectionModal } from './SectionModal'

interface FormState {
  id: string | null
  word: string
  pronunciation: string
  meaning: string
}

const EMPTY: FormState = { id: null, word: '', pronunciation: '', meaning: '' }

const inputStyle = {
  background: 'var(--color-background)',
  borderColor: 'var(--color-paper-lines)',
  color: 'var(--color-ink)',
} as const

export function GlossarySection({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const { glossary, loadGlossary, createGlossary, updateGlossary, removeGlossary } = useWorldbuildingStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<GlossaryEntry | null>(null)

  useEffect(() => {
    loadGlossary(projectId)
  }, [projectId, loadGlossary])

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
          onClick={() => { setForm(EMPTY); setOpen(true) }}
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
                  <button onClick={() => { setForm({ id: entry.id, word: entry.word, pronunciation: entry.pronunciation ?? '', meaning: entry.meaning ?? '' }); setOpen(true) }} aria-label={t('common.edit')} className="rounded p-1 hover:opacity-70" style={{ color: 'var(--color-ink-light)' }}>
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
        <SectionModal title={form.id ? t('common.edit') : t('worldApp.newGlossary')} isSaving={isSaving} onClose={() => setOpen(false)} onSave={handleSave}>
          <div>
            <label htmlFor="gl-word" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.word')}</label>
            <input id="gl-word" type="text" value={form.word} onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="gl-pronunciation" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.pronunciation')}</label>
            <input id="gl-pronunciation" type="text" value={form.pronunciation} onChange={(e) => setForm((f) => ({ ...f, pronunciation: e.target.value }))} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="gl-meaning" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('worldApp.meaning')}</label>
            <textarea id="gl-meaning" value={form.meaning} onChange={(e) => setForm((f) => ({ ...f, meaning: e.target.value }))} rows={3} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm resize-y" style={inputStyle} />
          </div>
        </SectionModal>
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
