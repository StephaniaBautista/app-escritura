import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StickyNote, Plus } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import type { Note } from '@/types/document'
import { PostIt } from './PostIt'
import { InlineCreateInput } from '@/components/ui/InlineCreateInput'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LoadingState } from '@/components/ui/LoadingState'

interface NotesListProps {
  documentId: string
}

export function NotesList({ documentId }: NotesListProps) {
  const { t } = useTranslation()
  const { notes, notesLoading, loadNotes, createNote, updateNote, deleteNote } = useDocumentStore()
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  useEffect(() => {
    loadNotes(documentId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

  const handleCreate = async (title: string) => {
    await createNote(documentId, { title })
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

      {isCreating && (
        <InlineCreateInput
          placeholder={t('postit.notePlaceholder')}
          onSubmit={handleCreate}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {notesLoading ? (
        <LoadingState label={t('common.loading')} className="notebook-paper" />
      ) : notes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note: Note, i: number) => (
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
