import { useState, useRef, useEffect } from 'react'

interface EditableTitleProps {
  title: string
  onSave: (newTitle: string) => void
  className?: string
  style?: React.CSSProperties
  tag?: 'h1' | 'h2' | 'h3'
}

export function EditableTitle({ title, onSave, className = '', style, tag: Tag = 'h1' }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue(title)
  }, [title])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== title) {
      onSave(trimmed)
    } else {
      setValue(title)
    }
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') { setValue(title); setIsEditing(false) }
        }}
        className={`bg-transparent border-b-2 outline-none ${className}`}
        style={{ ...style, borderColor: 'var(--color-accent)', width: '100%' }}
      />
    )
  }

  return (
    <Tag
      className={`cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      style={style}
      onClick={() => setIsEditing(true)}
      title="Click para editar"
    >
      {title}
    </Tag>
  )
}
