import { useEffect, useRef, useState } from 'react'

interface ColorDotProps {
  value: string | null
  palette: readonly string[]
  label: string
  onChange: (color: string | null) => void
  clearLabel?: string
  size?: 'sm' | 'md'
  disabled?: boolean
}

export function ColorDot({ value, palette, label, onChange, clearLabel, size = 'md', disabled = false }: ColorDotProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const dim = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${dim} rounded-full border-2 transition-transform hover:scale-105 disabled:opacity-50`}
        style={{
          borderColor: 'var(--color-ink-faint)',
          background: value ?? 'linear-gradient(90deg, var(--color-ink-faint) 50%, var(--color-paper) 50%)',
        }}
      />
      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute right-0 top-full z-20 mt-2 grid w-44 grid-cols-6 gap-2 rounded-xl border p-2.5 shadow-lg"
          style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
        >
          {palette.map((c) => (
            <button
              key={c}
              type="button"
              role="option"
              aria-selected={value === c}
              aria-label={c}
              onClick={() => {
                onChange(c)
                setOpen(false)
              }}
              className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
              style={{ background: c, borderColor: value === c ? 'var(--color-ink)' : 'transparent' }}
            />
          ))}
          {clearLabel && (
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className="col-span-6 mt-1 rounded-md py-1 text-xs font-medium hover:opacity-70"
              style={{ color: 'var(--color-ink-light)' }}
            >
              {clearLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
