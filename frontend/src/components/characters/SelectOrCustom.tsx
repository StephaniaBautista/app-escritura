interface SelectOption {
  value: string
  label: string
}

interface SelectOrCustomProps {
  value: string | null
  options: SelectOption[]
  onChange: (value: string | null) => void
  customPlaceholder?: string
  id?: string
}

export function SelectOrCustom({ value, options, onChange, customPlaceholder, id }: SelectOrCustomProps) {
  const isCustom = value !== null && !options.some((o) => o.value === value)

  if (isCustom) {
    return (
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder={customPlaceholder}
        className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2"
        style={{
          background: 'var(--color-background)',
          borderColor: 'var(--color-paper-lines)',
          color: 'var(--color-ink)',
        }}
      />
    )
  }

  const selectStyle = {
    background: 'var(--color-background)',
    borderColor: 'var(--color-paper-lines)',
    color: 'var(--color-ink)',
  }

  return (
    <select
      id={id}
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value
        onChange(v === '' ? null : v === '__custom__' ? '' : v)
      }}
      className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2"
      style={selectStyle}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
      <option value="__custom__">✏️ {customPlaceholder}</option>
    </select>
  )
}
