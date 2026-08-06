import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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

const MENU_WIDTH = 150
const ITEM_HEIGHT = 30

export function KebabMenu({ onDelete, items }: KebabMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const menuItems: KebabMenuItem[] = items ?? (onDelete ? [{
    label: t('common.delete'),
    icon: Trash2,
    onClick: onDelete,
    danger: true,
  }] : [])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      const insideTrigger = ref.current?.contains(target)
      const insideMenu = menuRef.current?.contains(target)
      if (!insideTrigger && !insideMenu) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleToggle = () => {
    const next = !open
    if (next) {
      const rect = ref.current?.getBoundingClientRect()
      if (rect) {
        const menuHeight = menuItems.length * ITEM_HEIGHT + 12
        const spaceBelow = window.innerHeight - rect.bottom
        const openUp = spaceBelow < menuHeight
        const top = openUp ? Math.max(4, rect.top - menuHeight - 4) : rect.bottom + 4
        const left = Math.max(4, rect.right - MENU_WIDTH)
        setPos({ top, left })
      }
    }
    setOpen(next)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleToggle()
        }}
        className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
        style={{ color: 'var(--color-ink-faint)' }}
        aria-label={t('common.moreOptions')}
        aria-expanded={open}
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          className="fixed z-50 py-1 rounded-lg shadow-xl min-w-[150px] overflow-hidden"
          style={{
            top: pos.top,
            left: pos.left,
            width: MENU_WIDTH,
            background: 'var(--color-paper)',
            border: '1px solid var(--color-paper-lines)',
          }}
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
        </div>,
        document.body
      )}
    </div>
  )
}
