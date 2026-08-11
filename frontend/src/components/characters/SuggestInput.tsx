import { useId } from 'react'

interface SuggestInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  disabled?: boolean
}

export function SuggestInput({ id, value, onChange, suggestions, placeholder, disabled = false }: SuggestInputProps) {
  const listId = useId()

  return (
    <>
      <input
        id={id}
        list={listId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="character-form__control"
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  )
}
