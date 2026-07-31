import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface KebabMenuProps {
  onDelete: () => void
}

export function KebabMenu({ onDelete }: KebabMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(!open)
        }}
        className="p-2.5 rounded-lg hover:opacity-80 transition-opacity"
        style={{ color: 'var(--color-ink-faint)' }}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-30 min-w-[140px]"
          style={{ background: 'var(--color-paper)', border: '1px solid var(--color-paper-lines)' }}
        >
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setOpen(false)
              onDelete()
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:opacity-80 transition-opacity text-left"
            style={{ color: 'var(--color-accent)' }}
          >
            <Trash2 className="w-4 h-4" />
            {t('common.delete')}
          </button>
        </div>
      )}
    </div>
  )
}
