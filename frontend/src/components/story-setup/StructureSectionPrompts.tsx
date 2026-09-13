import { useTranslation } from 'react-i18next'
import type { StoryStructureSection } from '@/types/story'
import {
  DESARROLLO_SCENES_PROMPT_ID,
  parseSceneSuggestions,
  structurePromptValue,
  structurePromptsFor,
  type StructurePrompt,
} from '@/lib/structure-prompts'

interface StructureSectionPromptsProps {
  section: StoryStructureSection
  onAnswer: (questionId: string, value: string, options?: { clearContent?: boolean }) => void
}

function PromptField({
  sectionId,
  prompt,
  value,
  onChange,
}: {
  sectionId: string
  prompt: StructurePrompt
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  const fieldId = `${sectionId}-${prompt.id.replace(/:/g, '-')}`
  const scenes = prompt.id === DESARROLLO_SCENES_PROMPT_ID ? parseSceneSuggestions(value) : []

  return (
    <div>
      <label htmlFor={fieldId} className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink-light)' }}>
        {t(prompt.labelKey)}
      </label>
      {prompt.hintKey && (
        <p id={`${fieldId}-hint`} className="text-xs mb-2 leading-relaxed" style={{ color: 'var(--color-ink-faint)' }}>
          {t(prompt.hintKey)}
        </p>
      )}
      <textarea
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t(prompt.placeholderKey)}
        rows={prompt.id === DESARROLLO_SCENES_PROMPT_ID ? 4 : 3}
        aria-describedby={prompt.hintKey ? `${fieldId}-hint` : undefined}
        className="w-full rounded-lg border px-3 py-2.5 text-sm resize-none"
        style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
      />
      {scenes.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mt-2">
          {scenes.map((scene) => (
            <li
              key={`${scene.form}-${scene.title}`}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
              style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
            >
              <span style={{ color: 'var(--color-accent)' }}>
                {scene.form === 'note' ? t('storySetup.structureSceneNote') : t('storySetup.structureSceneChapter')}
              </span>
              {scene.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function StructureSectionPrompts({ section, onAnswer }: StructureSectionPromptsProps) {
  const prompts = structurePromptsFor(section.id)
  if (prompts.length === 0) return null

  return (
    <div className="space-y-3">
      {prompts.map((prompt, index) => (
        <PromptField
          key={prompt.id}
          sectionId={section.id}
          prompt={prompt}
          value={structurePromptValue(section, prompt, index)}
          onChange={(value) =>
            onAnswer(prompt.id, value, {
              clearContent: index === 0 && Boolean(section.content?.trim()) && !section.answers?.[prompt.id]?.trim(),
            })
          }
        />
      ))}
    </div>
  )
}
