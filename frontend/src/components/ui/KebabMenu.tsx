import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface KebabMenuItem {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: () => void
  danger?: boolean
}

interface KebabMenuProps {
  onDelete?: () => void
  items?: KebabMenuItem[]
}

export function KebabMenu({ onDelete, items }: KebabMenuProps) {
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

  const menuItems: KebabMenuItem[] = items ?? (onDelete ? [{
    label: t('common.delete'),
    icon: Trash2,
    onClick: onDelete,
    danger: true,
  }] : [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(!open)
        }}
        className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
        style={{ color: 'var(--color-ink-faint)' }}
        aria-label={t('common.moreOptions')}
        aria-expanded={open}
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-30 min-w-[150px] overflow-hidden"
          style={{ background: 'var(--color-paper)', border: '1px solid var(--color-paper-lines)' }}
        >
          {menuItems.map((item, idx) => {
            const Icon = item.icon
            return (
              <button
                key={idx}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setOpen(false)
                  item.onClick()
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm hover:opacity-80 transition-opacity text-left"
                style={{ color: item.danger ? 'var(--color-accent)' : 'var(--color-ink)' }}
              >
                {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

