import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import { ProjectTree } from './ProjectTree'
import { ChapterTree } from '@/components/editor/ChapterTree'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InputDialog } from '@/components/ui/InputDialog'

export function Sidebar() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    documentTree,
    currentDocument,
    createDocument,
    deleteDocument,
  } = useDocumentStore()
  const [showNewChapter, setShowNewChapter] = useState(false)
  const [newChapterName, setNewChapterName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [subpageParent, setSubpageParent] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const handleSelectDoc = (id: string) => {
    if (projectId) {
      navigate(`/app/editor/${projectId}/${id}`)
    }
  }

  const handleCreateChapter = async () => {
    if (!projectId) return
    setShowNewChapter(true)
  }

  const handleConfirmChapter = async () => {
    if (!newChapterName.trim() || !projectId) return
    const doc = await createDocument({
      title: newChapterName.trim(),
      type: 'chapter',
      projectId,
    })
    setNewChapterName('')
    setShowNewChapter(false)
    navigate(`/app/editor/${projectId}/${doc.id}`)
  }

  const handleCreateSubpage = (parentId: string) => {
    setSubpageParent(parentId)
  }

  const handleConfirmSubpage = async (name: string) => {
    if (!projectId || !subpageParent) return
    const doc = await createDocument({
      title: name,
      type: 'subpage',
      projectId,
      parentId: subpageParent,
    })
    setSubpageParent(null)
    navigate(`/app/editor/${projectId}/${doc.id}`)
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    deleteDocument(deleteTarget)
    if (currentDocument?.id === deleteTarget && projectId) {
      navigate(`/app/editor/${projectId}`)
    }
    setDeleteTarget(null)
  }

  if (collapsed) {
    return (
      <aside
        className="w-12 border-r flex flex-col h-full items-center py-3 flex-shrink-0"
        style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
      >
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded-lg hover:opacity-80 transition-opacity mb-4"
          style={{ color: 'var(--color-ink-faint)' }}
          title={t('sidebar.expand')}
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      </aside>
    )
  }

  return (
    <aside
      className="w-64 border-r flex flex-col h-full flex-shrink-0"
      style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
    >
      <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-paper-lines)' }}>
        <BookOpen className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
        <span className="font-semibold flex-1" style={{ color: 'var(--color-ink)' }}>Escritura</span>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
          style={{ color: 'var(--color-ink-faint)' }}
          title={t('sidebar.collapse')}
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ProjectTree activeProjectId={projectId ?? null} />

        {projectId && (
          <div className="mt-2 border-t pt-2" style={{ borderColor: 'var(--color-paper-lines)' }}>
            <ChapterTree
              documents={documentTree}
              activeDocId={currentDocument?.id ?? null}
              onSelect={handleSelectDoc}
              onCreateChapter={handleCreateChapter}
              onCreateSubpage={handleCreateSubpage}
              onDelete={(id) => setDeleteTarget(id)}
            />
          </div>
        )}

        {showNewChapter && (
          <div className="px-3 py-2">
            <input
              autoFocus
              value={newChapterName}
              onChange={(e) => setNewChapterName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmChapter()
                if (e.key === 'Escape') { setShowNewChapter(false); setNewChapterName('') }
              }}
              placeholder={t('editorApp.newDoc')}
              className="w-full px-2 py-1.5 text-sm rounded border"
              style={{
                background: 'var(--color-background)',
                borderColor: 'var(--color-paper-lines)',
                color: 'var(--color-ink)',
              }}
              onBlur={() => { if (!newChapterName.trim()) setShowNewChapter(false) }}
            />
          </div>
        )}
      </div>

      <InputDialog
        isOpen={subpageParent !== null}
        title={t('editorApp.newSubpage')}
        placeholder={t('editorApp.subpageName')}
        onSubmit={handleConfirmSubpage}
        onCancel={() => setSubpageParent(null)}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('folder.deleteDocument')}
        message={t('folder.confirmDelete')}
        confirmLabel={t('common.delete')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </aside>
  )
}
