import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import { ProjectTree } from './ProjectTree'
import { ChapterTree } from '@/components/editor/ChapterTree'

export function Sidebar() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const {
    documentTree,
    currentDocument,
    selectProject,
    createDocument,
    deleteDocument,
    clearCurrentDocument,
  } = useDocumentStore()
  const [showNewChapter, setShowNewChapter] = useState(false)
  const [newChapterName, setNewChapterName] = useState('')

  useEffect(() => {
    if (projectId) {
      selectProject(projectId)
    } else {
      clearCurrentDocument()
    }
  }, [projectId, selectProject, clearCurrentDocument])

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

  const handleCreateSubpage = async (parentId: string) => {
    if (!projectId) return
    const name = prompt('Nombre de la subpágina:')
    if (!name?.trim()) return
    const doc = await createDocument({
      title: name.trim(),
      type: 'subpage',
      projectId,
      parentId,
    })
    navigate(`/app/editor/${projectId}/${doc.id}`)
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este documento?')) {
      await deleteDocument(id)
      if (currentDocument?.id === id && projectId) {
        navigate(`/app/editor/${projectId}`)
      }
    }
  }

  return (
    <aside
      className="w-64 border-r flex flex-col h-full"
      style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
    >
      <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-paper-lines)' }}>
        <BookOpen className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
        <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>Escritura</span>
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
              onDelete={handleDelete}
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
              placeholder="Nombre del capítulo..."
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
    </aside>
  )
}
