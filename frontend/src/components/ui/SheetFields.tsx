import { ChevronDown, type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

const underline = {
  borderColor: 'var(--color-paper-lines)',
  color: 'var(--color-ink)',
} as const

export function UnderlineInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`sheet-underline w-full bg-transparent border-0 border-b py-2.5 text-[15px] placeholder:opacity-70 disabled:opacity-60 ${props.className ?? ''}`}
      style={{ ...underline, ...props.style }}
    />
  )
}

interface UnderlineSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode
  icon?: LucideIcon
  children: ReactNode
}

export function UnderlineSelect({ label, icon: Icon, children, className, ...props }: UnderlineSelectProps) {
  return (
    <label className={`inline-flex items-center gap-2 border-b pb-1 ${className ?? ''}`} style={underline}>
      {Icon && <Icon className="h-4 w-4 shrink-0" style={{ color: 'var(--color-ink-light)' }} />}
      {label && <span className="text-[15px] shrink-0" style={{ color: 'var(--color-ink-light)' }}>{label}</span>}
      <span className="relative inline-flex min-w-0 flex-1 items-center">
        <select
          {...props}
          className="w-full appearance-none bg-transparent pr-6 text-[15px] focus:outline-none disabled:opacity-60"
          style={{ color: 'var(--color-ink)' }}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-0 h-4 w-4" style={{ color: 'var(--color-ink-light)' }} />
      </span>
    </label>
  )
}

interface SectionTitleProps {
  icon: LucideIcon
  children: ReactNode
  className?: string
}

export function SectionTitle({ icon: Icon, children, className }: SectionTitleProps) {
  return (
    <h3 className={`flex items-center gap-2 text-[15px] font-bold ${className ?? ''}`} style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-body)' }}>
      <Icon className="h-5 w-5 shrink-0" />
      {children}
    </h3>
  )
}

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'outline'
  icon?: LucideIcon
  children: ReactNode
}

export function PillButton({ variant = 'filled', icon: Icon, children, className, style, ...props }: PillButtonProps) {
  const filled = variant === 'filled'
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-medium transition-all hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed ${filled ? 'text-white' : 'border'} ${className ?? ''}`}
      style={{
        background: filled ? 'var(--color-accent)' : 'transparent',
        color: filled ? undefined : 'var(--color-ink)',
        borderColor: filled ? undefined : 'var(--color-ink)',
        ...style,
      }}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {children}
    </button>
  )
}

interface PillSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode
}

export function PillSelect({ children, className, ...props }: PillSelectProps) {
  return (
    <span className={`relative inline-flex items-center rounded-full border ${className ?? ''}`} style={{ borderColor: 'var(--color-ink)' }}>
      <select
        {...props}
        className="appearance-none bg-transparent py-2.5 pl-5 pr-9 text-[15px] font-medium focus:outline-none disabled:opacity-60"
        style={{ color: 'var(--color-ink)' }}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4" style={{ color: 'var(--color-ink)' }} />
    </span>
  )
}

