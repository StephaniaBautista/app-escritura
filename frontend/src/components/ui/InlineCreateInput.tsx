import { useState } from 'react'

interface InlineCreateInputProps {
  placeholder: string
  onSubmit: (value: string) => Promise<void>
  onCancel: () => void
}

export function InlineCreateInput({ placeholder, onSubmit, onCancel }: InlineCreateInputProps) {
  const [value, setValue] = useState('')

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      await onSubmit(value.trim())
      setValue('')
    }
    if (e.key === 'Escape') {
      setValue('')
      onCancel()
    }
  }

  return (
    <div className="mb-4 notebook-paper p-4">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg border"
        style={{
          background: 'var(--color-background)',
          borderColor: 'var(--color-paper-lines)',
          color: 'var(--color-ink)',
        }}
        onBlur={() => { if (!value.trim()) onCancel() }}
      />
    </div>
  )
}
