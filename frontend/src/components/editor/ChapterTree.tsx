import { useState } from 'react'
import { ChevronRight, ChevronDown, FileText, Plus, Edit2, Copy, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { KebabMenu, type KebabMenuItem } from '@/components/ui/KebabMenu'
import type { DocumentNode } from '@/types/document'

interface ChapterTreeProps {
  documents: DocumentNode[]
  activeDocId: string | null
  onSelect: (id: string) => void
  onCreateSubpage: (parentId: string) => void
  onRename?: (id: string, currentTitle: string) => void
  onDuplicate?: (id: string) => void
  onDelete: (id: string) => void
}

export function ChapterTree({
  documents,
  activeDocId,
  onSelect,
  onCreateSubpage,
  onRename,
  onDuplicate,
  onDelete,
}: ChapterTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const { t } = useTranslation()

  const rootDocs = documents.filter((d) => !d.parentId)
  const childrenMap = new Map<string, DocumentNode[]>()
  documents.forEach((d) => {
    if (d.parentId) {
      const children = childrenMap.get(d.parentId) || []
      children.push(d)
      childrenMap.set(d.parentId, children)
    }
  })

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderNode = (node: DocumentNode, depth: number = 0) => {
    const children = childrenMap.get(node.id) || []
    const hasChildren = children.length > 0
    const isExpanded = expanded.has(node.id)
    const isActive = activeDocId === node.id

    const menuItems: KebabMenuItem[] = [
      {
        label: t('editorApp.addSubtab'),
        icon: Plus,
        onClick: () => onCreateSubpage(node.id),
      },
    ]

    if (onRename) {
      menuItems.push({
        label: t('editorApp.rename'),
        icon: Edit2,
        onClick: () => onRename(node.id, node.title),
      })
    }

    if (onDuplicate) {
      menuItems.push({
        label: t('editorApp.duplicate'),
        icon: Copy,
        onClick: () => onDuplicate(node.id),
      })
    }

    menuItems.push({
      label: t('editorApp.delete'),
      icon: Trash2,
      onClick: () => onDelete(node.id),
      danger: true,
    })

    return (
      <div key={node.id} className="w-full">
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-2 rounded-xl cursor-pointer group text-sm transition-all relative select-none',
            isActive ? 'font-semibold shadow-xs' : 'hover:bg-black/5 dark:hover:bg-white/5'
          )}
          style={{
            paddingLeft: `${depth * 16 + 10}px`,
            color: isActive ? 'var(--color-accent)' : 'var(--color-ink)',
            background: isActive ? 'var(--color-accent-light)' : 'transparent',
          }}
          onClick={() => onSelect(node.id)}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-label={isExpanded ? 'collapse tab' : 'expand tab'}
              onClick={(e) => {
                e.stopPropagation()
                toggle(node.id)
              }}
              className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0"
              style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-ink-faint)' }}
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (

            <span className="w-4 flex-shrink-0" />
          )}

          <FileText
            className="w-4 h-4 flex-shrink-0 transition-colors"
            style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-ink-faint)' }}
          />

          <span className="flex-1 truncate text-xs sm:text-sm">
            {node.title}
          </span>

          <div
            className={cn(
              'flex items-center transition-opacity ml-auto',
              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <KebabMenu items={menuItems} />
          </div>
        </div>

        {isExpanded && children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-1 py-1">
      {rootDocs.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-ink-faint)' }}>
          {t('editorApp.noTabs')}
        </div>
      ) : (
        rootDocs.map((doc) => renderNode(doc))
      )}
    </div>
  )
}
