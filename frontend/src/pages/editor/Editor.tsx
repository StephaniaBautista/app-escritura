import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Plus, FileText, BookOpen, FolderOpen, History } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import { useToastStore } from '@/stores/toast-store'
import { useActivityStore } from '@/stores/activity-store'
import { getDocumentRootId, getDocumentTabs, getFirstTabId } from '@/lib/document-tabs'
import { DocumentEditor } from '@/components/editor/DocumentEditor'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { PostItWall } from '@/components/editor/PostItWall'
import { VersionsPanel } from '@/components/editor/VersionsPanel'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { InlineCreateInput } from '@/components/ui/InlineCreateInput'
import { EditableTitle } from '@/components/ui/EditableTitle'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAutoVersion } from '@/hooks/useAutoVersion'

export function EditorPage() {
  const { projectId, documentId } = useParams<{ projectId: string; documentId?: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    currentProject,
    currentDocument,
    documentTree,
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
  const hasChangesRef = useRef(false)
  const { addActivity } = useActivityStore()
  const activityThrottleRef = useRef<{ docId: string; at: number } | null>(null)

  const hasUnsavedChanges = useCallback(() => hasChangesRef.current, [])

  const recordEditActivity = useCallback(() => {
    if (!currentDocument) return
    const docId = currentDocument.id
    const now = Date.now()
    const prev = activityThrottleRef.current
    if (prev && prev.docId === docId && now - prev.at < 60_000) return
    activityThrottleRef.current = { docId, at: now }
    addActivity({
      type: 'document_edited',
      title: currentDocument.title,
      folderId: projectId,
      documentId: docId,
    })
  }, [addActivity, currentDocument, projectId])

  const { handleKeystroke } = useAutoVersion({
    documentId: documentId ?? null,
    hasUnsavedChanges,
    onVersionCreated: () => {
      useToastStore.getState().success(t('versions.created'))
    },
  })

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
      hasChangesRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

  useEffect(() => {
    if (!projectId || !currentDocument || currentDocument.type !== 'document') return
    const firstTabId = getFirstTabId(documentTree, currentDocument.id)
    if (firstTabId) {
      navigate(`/app/editor/${projectId}/${firstTabId}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, currentDocument, documentTree])

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
      const firstTabId = getFirstTabId(useDocumentStore.getState().documentTree, doc.id)
      navigate(`/app/editor/${projectId}/${firstTabId ?? doc.id}`)
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

    if (currentDocument.type === 'document') {
      const hasTabs = getDocumentTabs(documentTree, currentDocument.id).length > 0
      if (hasTabs) {
        return (
          <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
            <LoadingState />
          </div>
        )
      }
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
              onKeystroke={() => {
                hasChangesRef.current = true
                handleKeystroke()
                recordEditActivity()
              }}
            />
          </div>
          <PostItWall
            documentId={currentDocument.id}
            rootDocumentId={getDocumentRootId(documentTree, currentDocument.id) ?? currentDocument.id}
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
