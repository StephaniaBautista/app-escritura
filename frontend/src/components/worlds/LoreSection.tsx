import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, ScrollText, FileText } from 'lucide-react'
import type { LoreEntry, LoreEntryInput, LoreType } from '@/types/worldbuilding'
import { useWorldbuildingStore } from '@/stores/worldbuilding-store'
import { useToastStore } from '@/stores/toast-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { WorldFormSheet } from './WorldFormSheet'
import { EMPTY_LORE_FORM, LoreFormFields, type LoreFormState } from './LoreFormFields'

function toForm(entry: LoreEntry): LoreFormState {
  return {
    id: entry.id,
    name: entry.name,
    type: entry.type as LoreType,
    description: entry.description ?? '',
    limits: entry.limits ?? '',
    powerSource: entry.powerSource ?? '',
    cost: entry.cost ?? '',
    usedBy: entry.usedBy ?? '',
    pdfUrl: entry.pdfUrl,
    pdfName: entry.pdfName,
  }
}

function optional(value: string): string | null {
  return value.trim() || null
}

export function LoreSection({
  projectId,
  importDraft,
}: {
  projectId: string
  importDraft?: { text: string; nonce: number } | null
}) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const { lore, loadLore, createLore, updateLore, uploadLorePdf, removeLorePdf, removeLore } = useWorldbuildingStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<LoreFormState>(EMPTY_LORE_FORM)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [clearPdf, setClearPdf] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LoreEntry | null>(null)

  useEffect(() => {
    loadLore(projectId)
  }, [projectId, loadLore])

  useEffect(() => {
    if (!importDraft?.text) return
    setForm({ ...EMPTY_LORE_FORM, description: importDraft.text })
    setPdfFile(null)
    setClearPdf(false)
    setOpen(true)
  }, [importDraft])

  const patchForm = (patch: Partial<LoreFormState>) => setForm((current) => ({ ...current, ...patch }))

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error(t('worldApp.titleRequired'))
      return
    }
    if (!form.type) {
      toast.error(t('worldApp.loreTypeRequired'))
      return
    }
    setIsSaving(true)
    const data: LoreEntryInput = {
      name: form.name.trim(),
      type: form.type,
      description: optional(form.description),
      limits: optional(form.limits),
      powerSource: optional(form.powerSource),
      cost: optional(form.cost),
      usedBy: optional(form.usedBy),
    }
    try {
      const saved = form.id
        ? await updateLore(form.id, data)
        : await createLore(projectId, data)
      if (!saved) return
      if (pdfFile) {
        const withPdf = await uploadLorePdf(saved.id, pdfFile)
        if (!withPdf) return
      } else if (clearPdf && saved.pdfUrl) {
        const cleared = await removeLorePdf(saved.id)
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
          {t('worldApp.loreSubtitle')} · {lore.length}
        </p>
        <button
          onClick={() => {
            setForm(EMPTY_LORE_FORM)
            setPdfFile(null)
            setClearPdf(false)
            setOpen(true)
          }}
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
                      {t('worldApp.rulesLimits')}: {entry.limits}
                    </p>
                  )}
                  {entry.pdfName && (
                    <p className="mt-1.5 inline-flex items-center gap-1 text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                      <FileText className="h-3 w-3" />
                      {entry.pdfName}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={() => {
                      setForm(toForm(entry))
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
          variant="lore"
          eyebrow={t('worldApp.loreSheetLabel')}
          title={form.id ? form.name.trim() || t('common.edit') : t('worldApp.newLore')}
          isSaving={isSaving}
          onClose={() => setOpen(false)}
          onSave={() => void handleSave()}
        >
          <LoreFormFields
            form={form}
            onChange={patchForm}
            pdfFile={pdfFile}
            onPdfFile={(file) => { setPdfFile(file); if (file) setClearPdf(false) }}
            onRemovePdf={() => { setPdfFile(null); if (form.pdfUrl) setClearPdf(true); patchForm({ pdfName: null, pdfUrl: null }) }}
            isSaving={isSaving}
          />
        </WorldFormSheet>
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
