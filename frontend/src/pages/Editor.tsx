import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, FileText, BookOpen, Loader2, FolderOpen } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import { DocumentEditor } from '@/components/editor/DocumentEditor'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { InlineCreateInput } from '@/components/ui/InlineCreateInput'
import { EditableTitle } from '@/components/ui/EditableTitle'

export function EditorPage() {
  const { projectId, documentId } = useParams<{ projectId: string; documentId?: string }>()
  const navigate = useNavigate()
  const {
    currentProject,
    currentDocument,
    isLoading,
    error,
    selectProject,
    loadDocument,
    createDocument,
    updateDocument,
    clearCurrentDocument,
  } = useDocumentStore()

  const [showNewDoc, setShowNewDoc] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (projectId) {
      selectProject(projectId)
    }
    return () => clearCurrentDocument()
  }, [projectId, selectProject, clearCurrentDocument])

  useEffect(() => {
    if (documentId) {
      loadDocument(documentId)
    } else {
      clearCurrentDocument()
    }
  }, [documentId, loadDocument, clearCurrentDocument])

  const handleCreateDocument = async (title: string) => {
    if (!projectId) return
    setLocalError(null)
    try {
      const doc = await createDocument({
        title,
        type: 'document',
        projectId,
      })
      setShowNewDoc(false)
      navigate(`/app/editor/${projectId}/${doc.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear el documento'
      setLocalError(message)
    }
  }

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <div className="text-center">
          <FolderOpen className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-ink-faint)' }} />
          <h2 className="text-lg font-medium mb-2" style={{ color: 'var(--color-ink)' }}>
            Selecciona un proyecto
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>
            Elige un proyecto de la barra lateral o crea uno nuevo
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    )
  }

  if (!documentId || !currentDocument) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-ink-faint)' }} />
          <h2 className="text-lg font-medium mb-2" style={{ color: 'var(--color-ink)' }}>
            {currentProject?.name || 'Proyecto'}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-ink-light)' }}>
            Selecciona un documento de la barra lateral o crea uno nuevo
          </p>
          <button
            onClick={() => setShowNewDoc(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}
          >
            <Plus className="w-4 h-4" />
            Nuevo Documento
          </button>

          <ErrorMessage message={localError || error} />

          {showNewDoc && (
            <div className="mt-4 max-w-sm mx-auto">
              <InlineCreateInput
                placeholder="Título del documento..."
                onSubmit={handleCreateDocument}
                onCancel={() => setShowNewDoc(false)}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-background)' }}>
      <div className="border-b px-8 py-3 flex items-center gap-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
        <BookOpen className="w-4 h-4" style={{ color: 'var(--color-ink-faint)' }} />
        <div className="flex-1">
          <EditableTitle
            title={currentDocument.title}
            onSave={(newTitle) => updateDocument(currentDocument.id, { title: newTitle })}
            className="text-lg font-semibold"
            style={{ color: 'var(--color-ink)' }}
            tag="h1"
          />
          {currentDocument.parent && (
            <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
              en {currentDocument.parent.title}
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <DocumentEditor
          documentId={currentDocument.id}
          initialContent={currentDocument.content as Record<string, unknown>}
        />
      </div>
    </div>
  )
}
