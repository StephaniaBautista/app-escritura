import { useState } from 'react'
import { ChevronRight, ChevronDown, FileText, BookOpen, File, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocumentNode } from '@/types/document'

interface ChapterTreeProps {
  documents: DocumentNode[]
  activeDocId: string | null
  onSelect: (id: string) => void
  onCreateChapter: () => void
  onCreateSubpage: (parentId: string) => void
  onDelete: (id: string) => void
}

export function ChapterTree({ documents, activeDocId, onSelect, onCreateChapter, onCreateSubpage, onDelete }: ChapterTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<string | null>(null)

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

  const getIcon = (type: string) => {
    switch (type) {
      case 'chapter': return BookOpen
      case 'subpage': return File
      default: return FileText
    }
  }

  const renderNode = (node: DocumentNode, depth: number = 0) => {
    const children = childrenMap.get(node.id) || []
    const hasChildren = children.length > 0
    const isExpanded = expanded.has(node.id)
    const isActive = activeDocId === node.id
    const Icon = getIcon(node.type)

    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer group text-sm transition-colors',
            isActive && 'font-medium'
          )}
          style={{
            paddingLeft: `${depth * 16 + 8}px`,
            color: isActive ? 'var(--color-accent)' : 'var(--color-ink)',
            background: isActive ? 'var(--color-accent-light)' : 'transparent',
          }}
          onClick={() => onSelect(node.id)}
          onContextMenu={(e) => {
            e.preventDefault()
            setContextMenu(contextMenu === node.id ? null : node.id)
          }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggle(node.id) }}
              className="p-0.5 hover:opacity-80"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }} />
          <span className="flex-1 truncate">{node.title}</span>
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
            {node.type !== 'subpage' && (
              <button
                onClick={(e) => { e.stopPropagation(); onCreateSubpage(node.id); setContextMenu(null) }}
                className="p-0.5 rounded hover:opacity-80"
                title="Agregar subpágina"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(node.id); setContextMenu(null) }}
              className="p-0.5 rounded hover:opacity-80"
              title="Eliminar"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        {isExpanded && children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-ink-faint)' }}>
          Contenido
        </span>
        <button
          onClick={onCreateChapter}
          className="p-1 rounded hover:opacity-80"
          title="Nuevo capítulo"
        >
          <Plus className="w-3.5 h-3.5" style={{ color: 'var(--color-ink-light)' }} />
        </button>
      </div>
      {rootDocs.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-ink-faint)' }}>
          No hay capítulos aún
        </div>
      ) : (
        rootDocs.map((doc) => renderNode(doc))
      )}
    </div>
  )
}
