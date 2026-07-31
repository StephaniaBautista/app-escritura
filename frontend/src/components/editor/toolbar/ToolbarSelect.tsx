import { cn } from '@/lib/utils'

export interface ToolbarSelectOption {
  value: string
  label: string
  fontFamily?: string
}

interface ToolbarSelectProps {
  value: string
  onChange: (value: string) => void
  options: ToolbarSelectOption[]
  ariaLabel: string
  className?: string
  disabled?: boolean
}

export function ToolbarSelect({ value, onChange, options, ariaLabel, className, disabled }: ToolbarSelectProps) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'h-7 max-w-[140px] rounded px-1.5 text-xs transition-colors',
        'cursor-pointer disabled:cursor-not-allowed disabled:opacity-30',
        className
      )}
      style={{
        background: 'var(--color-background)',
        color: 'var(--color-ink)',
        border: '1px solid var(--color-paper-lines)',
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} style={option.fontFamily ? { fontFamily: option.fontFamily } : undefined}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
