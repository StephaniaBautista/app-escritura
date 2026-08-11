import { useState } from 'react'
import { X } from 'lucide-react'

interface ChipsInputProps {
  id?: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
}

export function ChipsInput({ id, value, onChange, placeholder, disabled = false }: ChipsInputProps) {
  const [text, setText] = useState('')

  const add = () => {
    if (disabled) return
    const trimmed = text.trim()
    if (!trimmed) return
    if (!value.includes(trimmed)) onChange([...value, trimmed])
    setText('')
  }

  return (
    <div
      className="character-form__chips flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-[var(--radius)] border"
      style={{
        background: 'var(--color-background)',
        borderColor: 'var(--color-paper-lines)',
        color: 'var(--color-ink)',
      }}
      onClick={(e) => {
        const input = e.currentTarget.querySelector('input')
        if (input && e.target !== input) input.focus()
      }}
    >
      {value.map((chip) => (
        <span
          key={chip}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: 'var(--color-accent-violet-light)', color: 'var(--color-accent-violet)' }}
        >
          {chip}
          <button
            type="button"
            onClick={() => onChange(value.filter((c) => c !== chip))}
            aria-label={`remove-${chip}`}
            disabled={disabled}
            className="hover:opacity-70 disabled:opacity-50"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          } else if (e.key === 'Backspace' && !text && value.length > 0) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={add}
        disabled={disabled}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[100px] bg-transparent text-sm outline-none disabled:opacity-50"
        style={{ color: 'var(--color-ink)' }}
      />
    </div>
  )
}
