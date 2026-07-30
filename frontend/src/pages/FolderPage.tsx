import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useDocumentStore } from '@/stores/document-store'
import { useActivityStore } from '@/stores/activity-store'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { InlineCreateInput } from '@/components/ui/InlineCreateInput'
import { EditableTitle } from '@/components/ui/EditableTitle'
import { FileText, Plus, Users, Globe } from 'lucide-react'

export function FolderPage() {
  const { folderId } = useParams<{ folderId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'documents'
  const { currentProject, documentTree, selectProject, createDocument, updateProject, error } = useDocumentStore()
  const { addActivity } = useActivityStore()
  const [isCreating, setIsCreating] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (folderId) {
      selectProject(folderId)
    }
  }, [folderId, selectProject])

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
    { id: 'characters', label: 'Personajes', icon: Users },
    { id: 'worlds', label: 'Mundos', icon: Globe },
  ]

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl">
        <div className="mb-6">
          <Link to="/app/documents" className="text-sm hover:opacity-80" style={{ color: 'var(--color-ink-light)' }}>
            ← Volver a documentos
          </Link>
          <EditableTitle
            title={currentProject?.name || 'Carpeta'}
            onSave={(newName) => {
              if (folderId) updateProject(folderId, { name: newName })
            }}
            className="font-display text-4xl font-bold mt-2"
            style={{ color: 'var(--color-ink)' }}
          />
        </div>

        <div className="flex gap-1 border-b mb-6" style={{ borderColor: 'var(--color-paper-lines)' }}>
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
              <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>Documentos</h2>
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ background: 'var(--color-accent)' }}
              >
                <Plus className="w-4 h-4" />
                Nuevo Documento
              </button>
            </div>

            {isCreating && (
              <InlineCreateInput
                placeholder="Título del documento..."
                onSubmit={handleCreateDocument}
                onCancel={() => setIsCreating(false)}
              />
            )}

            {documentTree.length > 0 ? (
              <div className="space-y-2">
                {documentTree.filter(d => d.type === 'document').map((doc) => (
                  <Link
                    key={doc.id}
                    to={`/app/editor/${folderId}/${doc.id}`}
                    className="notebook-paper p-4 flex items-center gap-3 hover:shadow-md transition-all"
                  >
                    <FileText className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate" style={{ color: 'var(--color-ink)' }}>{doc.title}</h3>
                      <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              !isCreating && (
                <div className="notebook-paper p-8 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-ink-faint)' }} />
                  <p className="font-display text-lg" style={{ color: 'var(--color-ink-light)' }}>
                    No hay documentos aún
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-ink-faint)' }}>
                    Crea tu primer documento en esta carpeta
                  </p>
                </div>
              )
            )}
          </div>
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
      </div>
    </div>
  )
}
