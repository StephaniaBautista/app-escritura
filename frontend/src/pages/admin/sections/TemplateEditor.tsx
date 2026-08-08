import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import { storyBankApi, type StoryQuestion, type StoryTemplate, type TemplateSection } from '@/services/story-bank'
import { isStandardSection, sectionLabelKey, STANDARD_SECTION_IDS } from '@/lib/story-structure'
import { useToastStore } from '@/stores/toast-store'

interface TemplateEditorProps {
  template: StoryTemplate | null
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

interface DraftSection {
  id: string
  title: string
  titleEn: string
  questionIds: string[]
}

interface Draft {
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  sections: DraftSection[]
}

const emptyDraft: Draft = { name: '', nameEn: '', description: '', descriptionEn: '', sections: [] }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-faint)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export function TemplateEditor({ template, isOpen, onClose, onSaved }: TemplateEditorProps) {
  const { t, i18n } = useTranslation()
  const toast = useToastStore()

  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [questions, setQuestions] = useState<StoryQuestion[] | null>(null)
  const [customTitle, setCustomTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const lang = i18n.language
  const qText = (q: StoryQuestion): string => (lang === 'en' && q.textEn ? q.textEn : q.text)

  useEffect(() => {
    if (!isOpen) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(
      template
        ? {
            name: template.name,
            nameEn: template.nameEn ?? '',
            description: template.description ?? '',
            descriptionEn: template.descriptionEn ?? '',
            sections: template.sections.map((s) => ({
              id: s.id,
              title: s.title ?? '',
              titleEn: s.titleEn ?? '',
              questionIds: [...s.questionIds],
            })),
          }
        : emptyDraft,
    )
    setCustomTitle('')
    setSaving(false)
    storyBankApi
      .listQuestions()
      .then(setQuestions)
      .catch(() => setQuestions([]))
  }, [isOpen, template])

  if (!isOpen) return null

  const setField = (field: keyof Draft, value: string) => setDraft((d) => ({ ...d, [field]: value }))

  const setSection = (id: string, patch: Partial<DraftSection>) =>
    setDraft((d) => ({ ...d, sections: d.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))

  const removeSection = (id: string) =>
    setDraft((d) => ({ ...d, sections: d.sections.filter((s) => s.id !== id) }))

  const usedIds = new Set(draft.sections.map((s) => s.id))
  const availableStandard = STANDARD_SECTION_IDS.filter((id) => !usedIds.has(id))

  const addStandard = (id: string) => {
    setDraft((d) => ({ ...d, sections: [...d.sections, { id, title: '', titleEn: '', questionIds: [] }] }))
  }

  const addCustom = () => {
    const title = customTitle.trim()
    if (!title) return
    setDraft((d) => ({
      ...d,
      sections: [...d.sections, { id: `custom-${Date.now()}-${d.sections.length}`, title, titleEn: '', questionIds: [] }],
    }))
    setCustomTitle('')
  }

  const toggleQuestion = (sectionId: string, questionId: string) => {
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) => {
        if (s.id !== sectionId) return s
        const has = s.questionIds.includes(questionId)
        return {
          ...s,
          questionIds: has ? s.questionIds.filter((q) => q !== questionId) : [...s.questionIds, questionId],
        }
      }),
    }))
  }

  const handleSave = async () => {
    if (!draft.name.trim()) return
    setSaving(true)
    try {
      const input = {
        name: draft.name.trim(),
        nameEn: draft.nameEn.trim() || null,
        description: draft.description.trim() || null,
        descriptionEn: draft.descriptionEn.trim() || null,
        sections: draft.sections.map((s): TemplateSection => ({
          id: s.id,
          ...(isStandardSection(s.id) ? {} : { title: s.title.trim(), titleEn: s.titleEn.trim() || undefined }),
          questionIds: s.questionIds,
        })),
      }
      if (template) {
        await storyBankApi.updateTemplate(template.id, input)
        toast.success(t('admin.bank.templateUpdated'))
      } else {
        await storyBankApi.createTemplate(input)
        toast.success(t('admin.bank.templateCreated'))
      }
      onSaved()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={template ? t('admin.bank.editTemplate') : t('admin.bank.addTemplate')}
        className="relative w-full max-w-2xl notebook-paper shadow-xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <h3 className="font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
            {template ? t('admin.bank.editTemplate') : t('admin.bank.addTemplate')}
          </h3>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="p-1.5 rounded-lg hover:opacity-80">
            <X className="w-5 h-5" style={{ color: 'var(--color-ink-light)' }} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('admin.bank.templateNameEs')}>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder={t('admin.bank.templateNameEsPlaceholder')}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
              />
            </Field>
            <Field label={t('admin.bank.templateNameEn')}>
              <input
                type="text"
                value={draft.nameEn}
                onChange={(e) => setField('nameEn', e.target.value)}
                placeholder={t('admin.bank.templateNameEnPlaceholder')}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
              />
            </Field>
            <Field label={t('admin.bank.templateDescEs')}>
              <input
                type="text"
                value={draft.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder={t('admin.bank.templateDescEsPlaceholder')}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
              />
            </Field>
            <Field label={t('admin.bank.templateDescEn')}>
              <input
                type="text"
                value={draft.descriptionEn}
                onChange={(e) => setField('descriptionEn', e.target.value)}
                placeholder={t('admin.bank.templateDescEnPlaceholder')}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
              />
            </Field>
          </div>

          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>
              {t('admin.bank.sectionsTitle')}
            </p>

            {draft.sections.length === 0 && (
              <p className="text-xs mb-3" style={{ color: 'var(--color-ink-faint)' }}>
                {t('admin.bank.sectionsEmpty')}
              </p>
            )}

            <div className="space-y-3">
              {draft.sections.map((section) => (
                <div key={section.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
                      {isStandardSection(section.id) ? t(sectionLabelKey(section.id)) : section.title}
                    </p>
                    <button type="button" onClick={() => removeSection(section.id)} aria-label={t('admin.bank.removeSection')} className="hover:opacity-70">
                      <Trash2 className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                    </button>
                  </div>

                  {!isStandardSection(section.id) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      <Field label={t('admin.bank.sectionTitleEs')}>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => setSection(section.id, { title: e.target.value })}
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                          style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
                        />
                      </Field>
                      <Field label={t('admin.bank.sectionTitleEn')}>
                        <input
                          type="text"
                          value={section.titleEn}
                          onChange={(e) => setSection(section.id, { titleEn: e.target.value })}
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                          style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
                        />
                      </Field>
                    </div>
                  )}

                  <details>
                    <summary className="text-xs font-medium cursor-pointer" style={{ color: 'var(--color-ink-light)' }}>
                      {t('admin.bank.questionsTitleShort')} ({section.questionIds.length})
                    </summary>
                    {questions === null ? (
                      <p className="text-xs py-2" style={{ color: 'var(--color-ink-faint)' }}>
                        {t('storySetup.loading')}
                      </p>
                    ) : (
                      <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                        {questions.map((q) => {
                          const checked = section.questionIds.includes(q.id)
                          return (
                            <label
                              key={q.id}
                              className="flex items-start gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:opacity-90"
                              style={{ background: checked ? 'var(--color-accent-light)' : 'transparent' }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleQuestion(section.id, q.id)}
                                className="mt-0.5 accent-current"
                              />
                              <span className="text-xs" style={{ color: 'var(--color-ink)' }}>{qText(q)}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </details>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {availableStandard.length > 0 && (
                <select
                  aria-label={t('admin.bank.addStandardSection')}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) addStandard(e.target.value)
                  }}
                  className="rounded-lg border px-2 py-2 text-sm"
                  style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
                >
                  <option value="">{t('admin.bank.addStandardSection')}</option>
                  {availableStandard.map((id) => (
                    <option key={id} value={id}>{t(sectionLabelKey(id))}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustom()
                  }
                }}
                placeholder={t('admin.bank.customSectionPlaceholder')}
                className="flex-1 min-w-40 rounded-lg border px-3 py-2 text-sm"
                style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
              />
              <button
                type="button"
                onClick={addCustom}
                disabled={!customTitle.trim()}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border hover:opacity-80 transition-all disabled:opacity-50"
                style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
              >
                <Plus className="w-4 h-4" />
                {t('admin.bank.addCustomSection')}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border hover:opacity-80 transition-colors"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!draft.name.trim() || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-all disabled:opacity-50"
            style={{ background: 'var(--color-accent)' }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
