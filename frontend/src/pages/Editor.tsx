import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, FileText, BookOpen, FolderOpen, History } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import { DocumentEditor } from '@/components/editor/DocumentEditor'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { PostItWall } from '@/components/editor/PostItWall'
import { VersionsPanel } from '@/components/editor/VersionsPanel'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { InlineCreateInput } from '@/components/ui/InlineCreateInput'
import { EditableTitle } from '@/components/ui/EditableTitle'
import { LoadingState } from '@/components/ui/LoadingState'

export function EditorPage() {
  const { projectId, documentId } = useParams<{ projectId: string; documentId?: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    currentProject,
    currentDocument,
    isLoading,
    error,
    selectProject,
    loadDocument,
    createDocument,
    updateDocument,
  } = useDocumentStore()

  const [showNewDoc, setShowNewDoc] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const loadedProjectRef = useRef<string | null>(null)

  useEffect(() => {
    if (projectId && projectId !== loadedProjectRef.current) {
      loadedProjectRef.current = projectId
      selectProject(projectId)
    }
    return () => { loadedProjectRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  useEffect(() => {
    if (documentId) {
      loadDocument(documentId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

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

  const renderContent = () => {
    if (isLoading && !currentProject) {
      return (
        <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
          <LoadingState />
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

    if (currentDocument.id !== documentId) {
      return (
        <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
          <LoadingState />
        </div>
      )
    }

    return (
      <>
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
          <button
            type="button"
            onClick={() => setShowPanel(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80 flex-shrink-0"
            style={{ color: 'var(--color-ink-light)', border: '1px solid var(--color-paper-lines)' }}
            title={t('versions.title')}
            aria-label={t('versions.title')}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">{t('versions.title')}</span>
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <DocumentEditor
              documentId={currentDocument.id}
              initialContent={currentDocument.content as Record<string, unknown>}
            />
          </div>
          <PostItWall
            documentId={currentDocument.id}
            projectId={projectId}
          />
        </div>

        {showPanel && (
          <VersionsPanel
            documentId={currentDocument.id}
            onClose={() => setShowPanel(false)}
          />
        )}
      </>
    )
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--color-background)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </div>
    </div>
  )
}
