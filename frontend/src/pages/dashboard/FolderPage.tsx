import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useDocumentStore } from '@/stores/document-store'
import { getDocumentRootId } from '@/lib/document-tabs'
import { useActivityStore } from '@/stores/activity-store'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { InlineCreateInput } from '@/components/ui/InlineCreateInput'
import { EditableTitle } from '@/components/ui/EditableTitle'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { KebabMenu } from '@/components/ui/KebabMenu'
import { LoadingState } from '@/components/ui/LoadingState'
import { NotesList } from '@/components/notes/NotesList'
import { VersionsList } from '@/components/versions/VersionsList'
import { StoryDescriptionSection } from '@/components/story-setup/StoryDescriptionSection'
import { StoryStructureTab } from '@/components/story-setup/StoryStructureTab'
import { StoryWizard } from '@/components/story-setup/StoryWizard'
import type { StoryMeta } from '@/types/story'
import { FileText, Plus, Users, Globe, StickyNote, History, Layers } from 'lucide-react'

export function FolderPage() {
  const { folderId } = useParams<{ folderId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'documents'
  const { currentProject, documentTree, isLoading, selectProject, createDocument, updateProject, deleteDocument, loadNotes, loadVersions, error } = useDocumentStore()
  const { addActivity } = useActivityStore()
  const { t } = useTranslation()
  const [isCreating, setIsCreating] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => {
    if (folderId) {
      selectProject(folderId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId])

  useEffect(() => {
    if (!selectedDocId) return
    if (activeTab === 'notes') {
      const rootId = getDocumentRootId(documentTree, selectedDocId) ?? selectedDocId
      loadNotes(rootId, selectedDocId)
    }
    if (activeTab === 'versions') loadVersions(selectedDocId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedDocId])

  const handleCreateDocument = async (title: string) => {
    if (!folderId) return
    setLocalError(null)
    try {
      const doc = await createDocument({
        title,
        type: 'document',
        projectId: folderId,
      })
      addActivity({
        type: 'document_created',
        title,
        folderId,
        documentId: doc.id,
      })
      setIsCreating(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear el documento'
      setLocalError(message)
    }
  }

  const tabs = [
    { id: 'documents', label: 'Documentos', icon: FileText },
    { id: 'structure', label: t('storySetup.structureTab'), icon: Layers },
    { id: 'characters', label: 'Personajes', icon: Users },
    { id: 'worlds', label: 'Mundos', icon: Globe },
    { id: 'notes', label: t('notes.title'), icon: StickyNote },
    { id: 'versions', label: t('versions.title'), icon: History },
  ]

  const documents = documentTree.filter((d) => d.type === 'document')

  const renderDocumentPicker = (emptyMessage: string) => (
    <div className="notebook-paper p-6 mb-4">
      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink)' }}>
        {t('folder.selectDocument')}
      </label>
      <select
        value={selectedDocId ?? ''}
        onChange={(e) => setSelectedDocId(e.target.value || null)}
        className="w-full px-3 py-2 text-sm rounded-lg border"
        style={{
          background: 'var(--color-background)',
          borderColor: 'var(--color-paper-lines)',
          color: 'var(--color-ink)',
        }}
      >
        <option value="">{t('folder.selectDocumentPlaceholder')}</option>
        {documents.map((doc) => (
          <option key={doc.id} value={doc.id}>{doc.title}</option>
        ))}
      </select>
      {!selectedDocId && (
        <p className="text-sm mt-3" style={{ color: 'var(--color-ink-faint)' }}>
          {emptyMessage}
        </p>
      )}
    </div>
  )

  return (
    <div className="p-6 md:p-8">
      <div>
        <div className="mb-6">
          <Link to="/app/documents" className="text-sm hover:opacity-80" style={{ color: 'var(--color-ink-light)' }}>
            ← Volver a documentos
          </Link>
          <EditableTitle
            title={currentProject?.name || 'Carpeta'}
            onSave={(newName) => {
              if (folderId) updateProject(folderId, { name: newName })
            }}
            className="font-display text-2xl sm:text-4xl font-bold mt-2"
            style={{ color: 'var(--color-ink)' }}
          />
        </div>

        {currentProject && (
          <StoryDescriptionSection
            description={currentProject.description}
            storyMeta={(currentProject.storyMeta ?? {}) as StoryMeta}
            onEdit={() => setShowWizard(true)}
          />
        )}

        <div className="flex gap-1 border-b mb-6 overflow-x-auto" style={{ borderColor: 'var(--color-paper-lines)' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setSearchParams({ tab: tab.id })}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px"
                style={{
                  color: isActive ? 'var(--color-accent)' : 'var(--color-ink-light)',
                  borderColor: isActive ? 'var(--color-accent)' : 'transparent',
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <ErrorMessage message={localError || error} />

        {activeTab === 'documents' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-xl sm:text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>{t('folder.documents')}</h2>
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ background: 'var(--color-accent)' }}
              >
                <Plus className="w-4 h-4" />
                {t('folder.newDocument')}
              </button>
            </div>

            {isCreating && (
              <InlineCreateInput
                placeholder="Título del documento..."
                onSubmit={handleCreateDocument}
                onCancel={() => setIsCreating(false)}
              />
            )}

            {isLoading && documentTree.length === 0 && !isCreating ? (
              <LoadingState label={t('common.loading')} className="notebook-paper" />
            ) : documentTree.length > 0 ? (
              <div className="space-y-2">
                {documentTree.filter(d => d.type === 'document').map((doc) => (
                  <div key={doc.id} className="relative group">
                    <Link
                      to={`/app/editor/${folderId}/${doc.id}`}
                      className="notebook-paper p-4 flex items-center gap-3 transition-all"
                    >
                      <FileText className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate" style={{ color: 'var(--color-ink)' }}>{doc.title}</h3>
                        <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                    <div className="absolute top-2 right-2 z-20">
                      <KebabMenu onDelete={() => setDeleteTarget(doc.id)} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !isCreating && (
                <div className="notebook-paper p-8 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-ink-faint)' }} />
                  <p className="font-display text-lg" style={{ color: 'var(--color-ink-light)' }}>
                    {t('folder.noDocuments')}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-ink-faint)' }}>
                    {t('folder.noDocumentsDesc')}
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === 'structure' && currentProject && (
          <StoryStructureTab
            projectId={folderId ?? ''}
            storyMeta={(currentProject.storyMeta ?? {}) as StoryMeta}
          />
        )}

        {activeTab === 'characters' && (
          <div className="notebook-paper p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-accent-teal)' }} />
            <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--color-ink)' }}>Personajes</h2>
            <p style={{ color: 'var(--color-ink-light)' }}>Próximamente: gestión de personajes</p>
          </div>
        )}

        {activeTab === 'worlds' && (
          <div className="notebook-paper p-8 text-center">
            <Globe className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-accent-violet)' }} />
            <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--color-ink)' }}>Mundos</h2>
            <p style={{ color: 'var(--color-ink-light)' }}>Próximamente: gestión de mundos</p>
          </div>
        )}

        {activeTab === 'notes' && (
          <div>
            {documents.length === 0 ? (
              <div className="notebook-paper p-8 text-center">
                <StickyNote className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-ink-faint)' }} />
                <p style={{ color: 'var(--color-ink-light)' }}>{t('notes.noDocuments')}</p>
              </div>
            ) : (
              <>
                {renderDocumentPicker(t('notes.selectHint'))}
                {selectedDocId && <NotesList documentId={selectedDocId} />}
              </>
            )}
          </div>
        )}

        {activeTab === 'versions' && (
          <div>
            {documents.length === 0 ? (
              <div className="notebook-paper p-8 text-center">
                <History className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-ink-faint)' }} />
                <p style={{ color: 'var(--color-ink-light)' }}>{t('versions.noDocuments')}</p>
              </div>
            ) : (
              <>
                {renderDocumentPicker(t('versions.selectHint'))}
                {selectedDocId && <VersionsList documentId={selectedDocId} />}
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('folder.deleteDocument')}
        message={t('folder.confirmDelete')}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (deleteTarget) deleteDocument(deleteTarget)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <StoryWizard
        projectId={folderId ?? ''}
        isOpen={showWizard}
        initialDescription={currentProject?.description ?? ''}
        initialMeta={currentProject?.storyMeta as StoryMeta | undefined}
        onClose={() => setShowWizard(false)}
        onSaved={() => setShowWizard(false)}
      />
    </div>
  )
}
