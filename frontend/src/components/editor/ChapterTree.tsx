import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useTranslation } from 'react-i18next'
import type { DocumentNode } from '@/types/document'
import { SortableTabRow, buildTabMenuItems } from './SortableTabRow'

interface ChapterTreeProps {
  documents: DocumentNode[]
  activeDocId: string | null
  onSelect: (id: string) => void
  onCreateSubpage: (parentId: string) => void
  onRename?: (id: string, currentTitle: string) => void
  onDuplicate?: (id: string) => void
  onDelete: (id: string) => void
  onReorder?: (parentId: string | null, documentIds: string[]) => void
}

function siblingParentId(node: DocumentNode, docIds: Set<string>): string | null {
  if (!node.parentId || !docIds.has(node.parentId)) return node.parentId ?? null
  return node.parentId
}

export function ChapterTree({
  documents,
  activeDocId,
  onSelect,
  onCreateSubpage,
  onRename,
  onDuplicate,
  onDelete,
  onReorder,
}: ChapterTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const { t } = useTranslation()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const docIds = new Set(documents.map((d) => d.id))
  const sortedDocs = [...documents].sort((a, b) => a.order - b.order)
  const rootDocs = sortedDocs.filter((d) => !d.parentId || !docIds.has(d.parentId))
  const childrenMap = new Map<string, DocumentNode[]>()
  sortedDocs.forEach((d) => {
    if (d.parentId && docIds.has(d.parentId)) {
      const children = childrenMap.get(d.parentId) || []
      children.push(d)
      childrenMap.set(d.parentId, children)
    }
  })
  const byId = new Map(sortedDocs.map((d) => [d.id, d]))

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (!onReorder) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeNode = byId.get(String(active.id))
    const overNode = byId.get(String(over.id))
    if (!activeNode || !overNode) return
    const activeParent = siblingParentId(activeNode, docIds)
    const overParent = siblingParentId(overNode, docIds)
    if (activeParent !== overParent) return
    const siblings = activeParent === null ? rootDocs : childrenMap.get(activeParent) ?? []
    const oldIndex = siblings.findIndex((d) => d.id === active.id)
    const newIndex = siblings.findIndex((d) => d.id === over.id)
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return
    const nextIds = arrayMove(siblings.map((d) => d.id), oldIndex, newIndex)
    onReorder(activeParent, nextIds)
  }

  const renderNode = (node: DocumentNode, depth: number = 0) => {
    const children = childrenMap.get(node.id) || []
    const hasChildren = children.length > 0
    const isExpanded = expanded.has(node.id)
    const isActive = activeDocId === node.id
    const menuItems = buildTabMenuItems({
      node,
      docIds,
      rootDocsLength: rootDocs.length,
      t,
      onCreateSubpage,
      onRename,
      onDuplicate,
      onDelete,
    })

    return (
      <div key={node.id} className="w-full">
        <SortableTabRow
          node={node}
          depth={depth}
          isActive={isActive}
          hasChildren={hasChildren}
          isExpanded={isExpanded}
          menuItems={menuItems}
          onSelect={onSelect}
          onToggleExpand={toggle}
          onRename={onRename}
        />
        {isExpanded && (
          <SortableContext items={children.map((child) => child.id)} strategy={verticalListSortingStrategy}>
            {children.map((child) => renderNode(child, depth + 1))}
          </SortableContext>
        )}
      </div>
    )
  }

  if (rootDocs.length === 0) {
    return (
      <div className="space-y-1 py-1">
        <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-ink-faint)' }}>
          {t('editorApp.noTabs')}
        </div>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={rootDocs.map((doc) => doc.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1 py-1">
          {rootDocs.map((doc) => renderNode(doc))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
