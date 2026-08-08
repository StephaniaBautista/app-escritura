import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, RefreshCw, RotateCcw, X } from 'lucide-react'
import { storyBankApi, type StoryQuestion, type StoryTemplate, type TemplateSection } from '@/services/story-bank'
import { isStandardSection, sectionLabelKey, STANDARD_SECTION_IDS } from '@/lib/story-structure'
import type { StoryMeta, StoryStructureSection } from '@/types/story'

interface StoryStructureProps {
  meta: StoryMeta
  update: (patch: Partial<StoryMeta>) => void
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border px-3 py-2.5 text-sm resize-none"
      style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
    />
  )
}

function sectionTitle(section: StoryStructureSection, t: (key: string) => string): string {
  if (isStandardSection(section.id)) return t(sectionLabelKey(section.id))
  return section.title ?? section.id
}

export function StoryStructure({ meta, update }: StoryStructureProps) {
  const { t, i18n } = useTranslation()
  const guided = meta.guidedMode === true

  const [templates, setTemplates] = useState<StoryTemplate[] | null>(null)
  const [questions, setQuestions] = useState<StoryQuestion[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [customName, setCustomName] = useState('')

  const structure = meta.structure ?? { sections: [] }
  const sections = structure.sections ?? []
  const loading = guided && templates === null && error === null

  const load = async () => {
    try {
      const [templatesRes, questionsRes] = await Promise.all([storyBankApi.listTemplates(), storyBankApi.listQuestions()])
      setTemplates(templatesRes)
      setQuestions(questionsRes)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  useEffect(() => {
    if (guided) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      load()
    }
  }, [guided])

  const handleRetry = () => {
    setError(null)
    load()
  }

  const lang = i18n.language
  const qText = (q: StoryQuestion): string => (lang === 'en' && q.textEn ? q.textEn : q.text)
  const templateName = (template: StoryTemplate): string =>
    lang === 'en' && template.nameEn ? template.nameEn : template.name
  const templateDescription = (template: StoryTemplate): string =>
    lang === 'en' && template.descriptionEn ? template.descriptionEn : (template.description ?? '')

  const setStructure = (patch: Partial<StoryMeta['structure']>) =>
    update({ structure: { ...structure, ...patch } })

  const toggleStandard = (id: string, enabled: boolean) => {
    const next = enabled
      ? [...sections, { id, content: '' }]
      : sections.filter((s) => s.id !== id)
    setStructure({ sections: next })
  }

  const addCustom = () => {
    const title = customName.trim()
    if (!title) return
    setStructure({ sections: [...sections, { id: `custom-${Date.now()}`, title, content: '' }] })
    setCustomName('')
  }

  const removeSection = (id: string) => {
    setStructure({ sections: sections.filter((s) => s.id !== id) })
  }

  const setContent = (id: string, value: string) => {
    setStructure({ sections: sections.map((s) => (s.id === id ? { ...s, content: value } : s)) })
  }

  const setAnswer = (sectionId: string, questionId: string, value: string) => {
    setStructure({
      sections: sections.map((s) =>
        s.id === sectionId ? { ...s, answers: { ...(s.answers ?? {}), [questionId]: value } } : s,
      ),
    })
  }

  const sectionHint = (id: string): string | undefined => {
    if (!isStandardSection(id)) return undefined
    return t(`storySetup.structure${capitalize(id)}Hint`)
  }

  const applyTemplate = (template: StoryTemplate) => {
    const existing = new Map(sections.map((s) => [s.id, s]))
    const next: StoryStructureSection[] = template.sections.map((ts: TemplateSection) => {
      const prev = existing.get(ts.id)
      return {
        id: ts.id,
        title: isStandardSection(ts.id) ? undefined : (ts.title ?? ts.id),
        content: prev?.content ?? '',
        answers: prev?.answers ?? {},
      }
    })
    setStructure({ templateId: template.id, sections: next })
  }

  const resetTemplate = () => {
    setStructure({ templateId: undefined, sections: [] })
  }

  const templateById = templates?.find((t) => t.id === structure.templateId) ?? null
  const questionById = new Map((questions ?? []).map((q) => [q.id, q]))

  if (guided && loading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2" style={{ color: 'var(--color-ink-faint)' }}>
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">{t('storySetup.loading')}</span>
      </div>
    )
  }

  if (guided && error) {
    return (
      <div className="text-center py-10">
        <p className="text-sm mb-3" style={{ color: 'var(--color-accent)' }}>{error}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border hover:opacity-80"
          style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('storySetup.retry')}
        </button>
      </div>
    )
  }

  if (guided) {
    if (!templateById) {
      return (
        <div className="space-y-4">
          <p className="block text-sm font-medium" style={{ color: 'var(--color-ink-light)' }}>
            {t('storySetup.templateQuestion')}
          </p>
          {!templates || templates.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
              {t('storySetup.templateEmpty')}
            </p>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => {
                const selected = structure.templateId === template.id
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="w-full px-4 py-3 rounded-lg border text-left transition-all hover:opacity-90"
                    style={{
                      borderColor: selected ? 'var(--color-accent)' : 'var(--color-paper-lines)',
                      background: selected ? 'var(--color-accent-light)' : 'var(--color-background)',
                      color: 'var(--color-ink)',
                    }}
                  >
                    <span className="block font-medium">{templateName(template)}</span>
                    {templateDescription(template) && (
                      <span className="block text-xs mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                        {templateDescription(template)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="font-display font-semibold" style={{ color: 'var(--color-ink)' }}>
            {templateName(templateById)}
          </p>
          <button
            type="button"
            onClick={resetTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border hover:opacity-80 transition-colors"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('storySetup.templateChange')}
          </button>
        </div>

        {sections.map((section, index) => (
          <div key={section.id} className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-accent)' }}>
              {index + 1}. {sectionTitle(section, t)}
            </p>
            <TextArea
              value={section.content ?? ''}
              onChange={(v) => setContent(section.id, v)}
              placeholder={sectionHint(section.id)}
              rows={2}
            />
            <div className="space-y-2 pl-3 border-l-2" style={{ borderColor: 'var(--color-paper-lines)' }}>
              {(templateById.sections.find((ts) => ts.id === section.id)?.questionIds ?? []).map((qid) => {
                const question = questionById.get(qid)
                if (!question) return null
                return (
                  <div key={qid}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-ink-faint)' }}>
                      {qText(question)}
                    </p>
                    <TextArea
                      value={(section.answers ?? {})[qid] ?? ''}
                      onChange={(v) => setAnswer(section.id, qid, v)}
                      rows={2}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const enabledIds = new Set(sections.map((s) => s.id))
  const customSections = sections.filter((s) => !isStandardSection(s.id))

  return (
    <div className="space-y-5">
      <p className="block text-sm font-medium" style={{ color: 'var(--color-ink-light)' }}>
        {t('storySetup.freeStructureQuestion')}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {STANDARD_SECTION_IDS.map((id) => {
          const enabled = enabledIds.has(id)
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggleStandard(id, !enabled)}
              className="px-3 py-2.5 rounded-lg text-sm border text-left transition-all hover:opacity-90"
              style={{
                borderColor: enabled ? 'var(--color-accent)' : 'var(--color-paper-lines)',
                background: enabled ? 'var(--color-accent-light)' : 'var(--color-background)',
                color: 'var(--color-ink)',
              }}
              aria-pressed={enabled}
            >
              {t(sectionLabelKey(id))}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
          placeholder={t('storySetup.customSectionPlaceholder')}
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customName.trim()}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-all disabled:opacity-50"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus className="w-4 h-4" />
          {t('storySetup.addSection')}
        </button>
      </div>

      {sections.map((section) => (
        <div key={section.id} className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-accent)' }}>
              {sectionTitle(section, t)}
            </p>
            {!isStandardSection(section.id) && (
              <button type="button" onClick={() => removeSection(section.id)} aria-label={t('common.remove')} className="hover:opacity-70">
                <X className="w-4 h-4" style={{ color: 'var(--color-ink-light)' }} />
              </button>
            )}
          </div>
          <TextArea
            value={section.content ?? ''}
            onChange={(v) => setContent(section.id, v)}
            placeholder={sectionHint(section.id)}
          />
        </div>
      ))}

      {customSections.length === 0 && sections.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
          {t('storySetup.freeStructureEmpty')}
        </p>
      )}
    </div>
  )
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
