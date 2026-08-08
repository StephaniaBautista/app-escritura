import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Layers, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { storyBankApi, type StoryTemplate } from '@/services/story-bank'
import { useToastStore } from '@/stores/toast-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TemplateEditor } from './TemplateEditor'

export function TemplatesManager() {
  const { t, i18n } = useTranslation()
  const toast = useToastStore()

  const [templates, setTemplates] = useState<StoryTemplate[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<StoryTemplate | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StoryTemplate | null>(null)

  const lang = i18n.language
  const templateName = (template: StoryTemplate): string =>
    lang === 'en' && template.nameEn ? template.nameEn : template.name
  const templateDescription = (template: StoryTemplate): string =>
    lang === 'en' && template.descriptionEn ? template.descriptionEn : (template.description ?? '')

  const load = async () => {
    setError(null)
    try {
      setTemplates(await storyBankApi.listTemplates())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await storyBankApi.deleteTemplate(deleteTarget.id)
      toast.success(t('admin.bank.templateDeleted'))
      setDeleteTarget(null)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>
          {t('admin.bank.templatesDesc')}
        </p>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-all"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus className="w-4 h-4" />
          {t('admin.bank.addTemplate')}
        </button>
      </div>

      {error && <p className="text-sm mb-3" style={{ color: 'var(--color-accent)' }}>{error}</p>}

      {templates === null ? (
        <div className="flex items-center justify-center py-10 gap-2" style={{ color: 'var(--color-ink-faint)' }}>
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--color-ink-faint)' }}>
          {t('admin.bank.templatesEmpty')}
        </p>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-lg border px-4 py-3 flex items-center gap-3"
              style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-accent-light)' }}>
                <Layers className="w-4.5 h-4.5" style={{ color: 'var(--color-accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
                  {templateName(template)}
                  {template.isDefault && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                      {t('admin.bank.default')}
                    </span>
                  )}
                </p>
                {templateDescription(template) && (
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                    {templateDescription(template)}
                  </p>
                )}
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                  {t('admin.bank.sectionsCount', { count: template.sections.length })}
                </p>
              </div>
              <button type="button" onClick={() => setEditing(template)} aria-label={t('admin.bank.editTemplate')} className="hover:opacity-70">
                <Pencil className="w-4 h-4" style={{ color: 'var(--color-ink-light)' }} />
              </button>
              <button type="button" onClick={() => setDeleteTarget(template)} aria-label={t('admin.bank.deleteTemplate')} className="hover:opacity-70">
                <Trash2 className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <TemplateEditor
        template={editing === 'new' ? null : editing}
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          load()
        }}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('admin.bank.deleteTemplateTitle')}
        message={deleteTarget ? t('admin.bank.deleteTemplateConfirm', { name: templateName(deleteTarget) }) : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
