import { useTranslation } from 'react-i18next'

interface TrainingMuteCheckboxProps {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export function TrainingMuteCheckbox({ checked, disabled, onChange }: TrainingMuteCheckboxProps) {
  const { t } = useTranslation()
  return (
    <label className="mb-4 flex cursor-pointer items-start gap-2 text-sm" style={{ color: 'var(--color-ink)' }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        style={{ accentColor: 'var(--color-accent)', marginTop: '0.2rem' }}
      />
      <span>{t('aiApp.training.dontShow')}</span>
    </label>
  )
}
