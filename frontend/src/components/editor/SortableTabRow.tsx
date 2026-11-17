import { ChevronRight, ChevronDown, FileText, Plus, Edit2, Copy, Trash2, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { KebabMenu, type KebabMenuItem } from '@/components/ui/KebabMenu'
import type { DocumentNode } from '@/types/document'

interface SortableTabRowProps {
  node: DocumentNode
  depth: number
  isActive: boolean
  hasChildren: boolean
  isExpanded: boolean
  menuItems: KebabMenuItem[]
  onSelect: (id: string) => void
  onToggleExpand: (id: string) => void
  onRename?: (id: string, currentTitle: string) => void
}

export function SortableTabRow({
  node,
  depth,
  isActive,
  hasChildren,
  isExpanded,
  menuItems,
  onSelect,
  onToggleExpand,
  onRename,
}: SortableTabRowProps) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        paddingLeft: `${depth * 16 + 10}px`,
        color: isActive ? 'var(--color-accent)' : 'var(--color-ink)',
        background: isActive ? 'var(--color-accent-light)' : 'transparent',
      }}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-2 rounded-xl cursor-pointer group text-sm transition-all relative select-none',
        isActive ? 'font-semibold shadow-xs' : 'hover:bg-black/5 dark:hover:bg-white/5'
      )}
      onClick={() => onSelect(node.id)}
      onDoubleClick={() => onRename?.(node.id, node.title)}
      title={onRename ? t('editorApp.renameTab') : undefined}
    >
      <button
        type="button"
        aria-label={t('editorApp.reorderTab')}
        title={t('editorApp.reorderTab')}
        className="p-0.5 -ml-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing"
        style={{ color: 'var(--color-ink-faint)' }}
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {hasChildren ? (
        <button
          type="button"
          aria-label={isExpanded ? 'collapse tab' : 'expand tab'}
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand(node.id)
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
  )
}

export function buildTabMenuItems({
  node,
  docIds,
  rootDocsLength,
  t,
  onCreateSubpage,
  onRename,
  onDuplicate,
  onDelete,
}: {
  node: DocumentNode
  docIds: Set<string>
  rootDocsLength: number
  t: (key: string) => string
  onCreateSubpage: (parentId: string) => void
  onRename?: (id: string, currentTitle: string) => void
  onDuplicate?: (id: string) => void
  onDelete: (id: string) => void
}): KebabMenuItem[] {
  const items: KebabMenuItem[] = [
    {
      label: t('editorApp.addSubtab'),
      icon: Plus,
      onClick: () => onCreateSubpage(node.id),
    },
  ]

  if (onRename) {
    items.push({
      label: t('editorApp.rename'),
      icon: Edit2,
      onClick: () => onRename(node.id, node.title),
    })
  }

  if (onDuplicate) {
    items.push({
      label: t('editorApp.duplicate'),
      icon: Copy,
      onClick: () => onDuplicate(node.id),
    })
  }

  const isRoot = !node.parentId || !docIds.has(node.parentId)
  const canDelete = isRoot ? rootDocsLength > 1 : true
  if (canDelete) {
    items.push({
      label: t('editorApp.delete'),
      icon: Trash2,
      onClick: () => onDelete(node.id),
      danger: true,
    })
  }

  return items
}
