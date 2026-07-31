import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StickyNote, Plus, BookText, FileText } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import type { Note } from '@/types/document'
import { PostIt } from './PostIt'
import { InlineCreateInput } from '@/components/ui/InlineCreateInput'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LoadingState } from '@/components/ui/LoadingState'

interface NotesListProps {
  documentId: string
  projectId: string
}

type Scope = 'document' | 'story'

export function NotesList({ documentId, projectId }: NotesListProps) {
  const { t } = useTranslation()
  const { notes, projectNotes, notesLoading, loadNotes, loadProjectNotes, createNote, createProjectNote, updateNote, deleteNote } = useDocumentStore()
  const [scope, setScope] = useState<Scope>('document')
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  useEffect(() => {
    if (scope === 'document') loadNotes(documentId)
    else loadProjectNotes(projectId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, documentId, projectId])

  const list = scope === 'document' ? notes : projectNotes

  const handleCreate = async (title: string) => {
    if (scope === 'document') await createNote(documentId, { title })
    else await createProjectNote(projectId, { title })
    setIsCreating(false)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-xl sm:text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>
          {t('notes.title')}
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus className="w-4 h-4" />
          {t('notes.newNote')}
        </button>
      </div>

      <div className="flex gap-1 mb-4">
        <button
          type="button"
          onClick={() => setScope('document')}
          aria-pressed={scope === 'document'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          style={{
            background: scope === 'document' ? 'var(--color-accent-light)' : 'transparent',
            color: scope === 'document' ? 'var(--color-accent)' : 'var(--color-ink-light)',
            border: `1px solid ${scope === 'document' ? 'var(--color-accent)' : 'var(--color-paper-lines)'}`,
          }}
        >
          <FileText className="w-3.5 h-3.5" />
          {t('postit.scopeDocument')}
        </button>
        <button
          type="button"
          onClick={() => setScope('story')}
          aria-pressed={scope === 'story'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          style={{
            background: scope === 'story' ? 'var(--color-accent-light)' : 'transparent',
            color: scope === 'story' ? 'var(--color-accent)' : 'var(--color-ink-light)',
            border: `1px solid ${scope === 'story' ? 'var(--color-accent)' : 'var(--color-paper-lines)'}`,
          }}
        >
          <BookText className="w-3.5 h-3.5" />
          {t('postit.scopeStory')}
        </button>
      </div>

      {isCreating && (
        <InlineCreateInput
          placeholder={t('postit.notePlaceholder')}
          onSubmit={handleCreate}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {notesLoading ? (
        <LoadingState label={t('common.loading')} className="notebook-paper" />
      ) : list.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((note: Note, i: number) => (
            <PostIt
              key={note.id}
              note={note}
              variant={(['yellow', 'blue', 'pink'] as const)[i % 3]}
              tilt={i % 2 === 0 ? -1 : 1}
              onUpdate={updateNote}
              onDelete={(id) => setDeleteTarget(id)}
            />
          ))}
        </div>
      ) : (
        !isCreating && (
          <div className="notebook-paper p-8 text-center">
            <StickyNote className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-ink-faint)' }} />
            <p className="font-display text-lg" style={{ color: 'var(--color-ink-light)' }}>
              {t('notes.empty')}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-ink-faint)' }}>
              {t('notes.emptyDesc')}
            </p>
          </div>
        )
      )}

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
