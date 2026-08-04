import { useTranslation } from 'react-i18next'

interface DirectModeProps {
  value: string
  onChange: (value: string) => void
}

export function DirectMode({ value, onChange }: DirectModeProps) {
  const { t } = useTranslation()

  return (
    <div>
      <label htmlFor="story-description" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>
        {t('storySetup.descriptionLabel')}
      </label>
      <textarea
        id="story-description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('storySetup.descriptionPlaceholder')}
        rows={6}
        className="w-full rounded-lg border px-3 py-2.5 text-sm resize-none focus:outline-none"
        style={{
          background: 'var(--color-background)',
          borderColor: 'var(--color-paper-lines)',
          color: 'var(--color-ink)',
        }}
        autoFocus
      />
    </div>
  )
}
