import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, PanelRightClose, PanelRightOpen, StickyNote, FileText, EyeOff } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import { PostIt, type PostItVariant } from '@/components/notes/PostIt'
import { InlineCreateInput } from '@/components/ui/InlineCreateInput'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface PostItWallProps {
  documentId: string
  rootDocumentId: string
  projectId: string
}

type Filter = 'all' | 'document' | 'subtab' | 'hidden'
type Scope = 'document' | 'subtab'

const VARIANTS: PostItVariant[] = ['yellow', 'blue', 'pink']

export function PostItWall({ documentId, rootDocumentId, projectId }: PostItWallProps) {
  const { t } = useTranslation()
  const { notes, projectNotes, loadNotes, loadProjectNotes, createNote, updateNote, deleteNote } = useDocumentStore()
  const [collapsed, setCollapsed] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createScope, setCreateScope] = useState<Scope>('document')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isSubtab = documentId !== rootDocumentId

  useEffect(() => {
    loadNotes(rootDocumentId, documentId)
    loadProjectNotes(projectId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, rootDocumentId, projectId])

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const visibleStory = projectNotes.filter((n) => !n.isHidden)
  const visibleDoc = notes.filter((n) => !n.isHidden && n.documentId === rootDocumentId)
  const visibleSubtab = notes.filter((n) => !n.isHidden && n.documentId !== rootDocumentId)
  const hidden = [...projectNotes, ...notes].filter((n) => n.isHidden)

  const list: typeof notes = filter === 'all' ? [...visibleStory, ...visibleDoc, ...visibleSubtab] : filter === 'document' ? visibleDoc : filter === 'subtab' ? visibleSubtab : hidden

  const handleCreate = async (title: string) => {
    if (createScope === 'document') await createNote(rootDocumentId, { title })
    else await createNote(documentId, { title })
    setIsCreating(false)
  }

  const filters: { id: Filter; label: string; icon: typeof StickyNote; badge?: number }[] = [
    { id: 'all', label: t('postit.filterAll'), icon: StickyNote },
    { id: 'document', label: t('postit.filterDocument'), icon: FileText },
    ...(isSubtab ? [{ id: 'subtab' as Filter, label: t('postit.filterSubtab'), icon: FileText }] : []),
    { id: 'hidden', label: t('postit.filterHidden'), icon: EyeOff, badge: hidden.length },
  ]

  if (collapsed) {
    return (
      <div
        className="w-10 border-l flex flex-col items-center py-3 flex-shrink-0"
        style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
          style={{ color: 'var(--color-ink-faint)' }}
          title={t('postit.expand')}
          aria-label={t('postit.expand')}
        >
          <PanelRightOpen className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      className="w-72 border-l flex flex-col flex-shrink-0 overflow-hidden"
      style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-paper-lines)' }}
      >
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-ink-faint)' }}>
          {t('notes.title')}
        </span>
        <div className="flex items-center gap-1">
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-1.5 rounded hover:opacity-80 transition-opacity"
              style={{ color: 'var(--color-ink-light)' }}
              title={t('postit.newNote')}
              aria-label={t('postit.newNote')}
            >
              <Plus className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-30 min-w-[150px]"
                style={{ background: 'var(--color-paper)', border: '1px solid var(--color-paper-lines)' }}
              >
                <button
                  type="button"
                  onClick={() => { setCreateScope('document'); setMenuOpen(false); setIsCreating(true) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--color-ink)' }}
                >
                  <FileText className="w-4 h-4" />
                  {t('postit.scopeDocument')}
                </button>
                {isSubtab && (
                  <button
                    type="button"
                    onClick={() => { setCreateScope('subtab'); setMenuOpen(false); setIsCreating(true) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    <FileText className="w-4 h-4" />
                    {t('postit.scopeSubtab')}
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded hover:opacity-80 transition-opacity"
            style={{ color: 'var(--color-ink-faint)' }}
            title={t('postit.collapse')}
            aria-label={t('postit.collapse')}
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        className="flex gap-1 px-3 py-2 border-b overflow-x-auto flex-shrink-0"
        style={{ borderColor: 'var(--color-paper-lines)' }}
      >
        {filters.map(({ id, label, icon: Icon, badge }) => {
          const isActive = filter === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              aria-pressed={isActive}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors flex-shrink-0"
              style={{
                background: isActive ? 'var(--color-accent-light)' : 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-ink-light)',
                border: `1px solid ${isActive ? 'var(--color-accent)' : 'var(--color-paper-lines)'}`,
              }}
            >
              <Icon className="w-3 h-3" />
              {label}
              {badge !== undefined && badge > 0 && (
                <span className="px-1 rounded-full text-[10px]" style={{ background: 'var(--color-accent)', color: '#fff' }}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isCreating && (
          <InlineCreateInput
            placeholder={t('postit.notePlaceholder')}
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
          />
        )}

        {list.length === 0 ? (
          <div className="text-center py-8">
            <StickyNote className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-ink-faint)' }} />
            <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
              {filter === 'hidden' ? t('postit.noHidden') : t('postit.noNotesInFilter')}
            </p>
          </div>
        ) : (
          list.map((note, i) => (
            <PostIt
              key={note.id}
              note={note}
              variant={VARIANTS[i % VARIANTS.length]}
              tilt={i % 2 === 0 ? -1 : 1}
              compact={filter === 'hidden'}
              onUpdate={updateNote}
              onDelete={(id) => setDeleteTarget(id)}
            />
          ))
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('notes.deleteTitle')}
        message={t('notes.confirmDelete')}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (deleteTarget) deleteNote(deleteTarget)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
