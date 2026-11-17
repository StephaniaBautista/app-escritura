interface SettingsSwitchProps {
  checked: boolean
  label: string
  disabled?: boolean
  onToggle: () => void
}

export function SettingsSwitch({ checked, label, disabled, onToggle }: SettingsSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className="settings-switch"
    >
      <span className="settings-switch__knob" />
    </button>
  )
}
