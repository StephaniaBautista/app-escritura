import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import type { AiWizardSuggestion } from '@/types/ai'

interface WizardStageSuggestionsProps {
  suggestions: AiWizardSuggestion[]
  onApply: (suggestion: AiWizardSuggestion) => void
}

function preview(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').join(', ')
  if (value && typeof value === 'object') return JSON.stringify(value)
  return ''
}

export function WizardStageSuggestions({ suggestions, onApply }: WizardStageSuggestionsProps) {
  const { t } = useTranslation()
  if (suggestions.length === 0) return null

  return (
    <ul className="mt-4 space-y-3" aria-label={t('storySetup.stageSuggestions')}>
      {suggestions.map((suggestion) => (
        <li
          key={`${suggestion.field}-${suggestion.title}`}
          className="rounded-lg border p-3"
          style={{ borderColor: 'var(--color-paper-lines)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{suggestion.title}</p>
          {suggestion.description ? (
            <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: 'var(--color-ink-light)' }}>{suggestion.description}</p>
          ) : null}
          <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: 'var(--color-ink)' }}>{preview(suggestion.value)}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => onApply(suggestion)}
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-accent)' }}
          >
            {t('storySetup.applySuggestion')}
          </Button>
        </li>
      ))}
    </ul>
  )
}
