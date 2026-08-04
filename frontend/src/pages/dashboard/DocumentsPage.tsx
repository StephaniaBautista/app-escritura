import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDocumentStore } from '@/stores/document-store'
import { useActivityStore } from '@/stores/activity-store'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { InlineCreateInput } from '@/components/ui/InlineCreateInput'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { KebabMenu } from '@/components/ui/KebabMenu'
import { FolderCreationDialog } from '@/components/story-setup/FolderCreationDialog'
import { StoryWizard } from '@/components/story-setup/StoryWizard'
import { Plus, FolderOpen, FileText, ChevronDown } from 'lucide-react'
import type { Project } from '@/types/document'

export function DocumentsPage() {
  const { projects, loadProjects, createProject, createDocument, deleteProject, error } = useDocumentStore()
  const { addActivity } = useActivityStore()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)
  const [showDocForm, setShowDocForm] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [createdProject, setCreatedProject] = useState<Project | null>(null)
  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => {
    loadProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  const handleCreateFolder = async (name: string) => {
    setLocalError(null)
    try {
      const project = await createProject(name)
      addActivity({
        type: 'folder_created',
        title: name,
        folderId: project.id,
      })
      setIsCreating(false)
      setCreatedProject(project)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear la carpeta'
      setLocalError(message)
    }
  }

  const handleSkipWizard = () => {
    if (!createdProject) return
    const id = createdProject.id
    setCreatedProject(null)
    navigate(`/app/documents/${id}`)
  }

  const handleCompleteWizard = () => {
    setShowWizard(true)
  }

  const handleWizardSaved = () => {
    if (!createdProject) return
    const id = createdProject.id
    setCreatedProject(null)
    setShowWizard(false)
    navigate(`/app/documents/${id}?tab=structure`)
  }

  const handleCreateDocument = async (title: string) => {
    if (!selectedProjectId) return
    setLocalError(null)
    try {
      const doc = await createDocument({
        title,
        type: 'document',
        projectId: selectedProjectId,
      })
      addActivity({
        type: 'document_created',
        title,
        folderId: selectedProjectId,
        documentId: doc.id,
      })
      setShowDocForm(false)
      navigate(`/app/editor/${selectedProjectId}/${doc.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear el documento'
      setLocalError(message)
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold" style={{ color: 'var(--color-ink)' }}>{t('projects.title')}</h1>
            <p className="text-base sm:text-lg" style={{ color: 'var(--color-ink-light)' }}>{t('projects.subtitle')}</p>
          </div>
          <div className="flex gap-2">
              <button
              onClick={() => { setIsCreating(true); setShowDocForm(false) }}
              className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] shadow-md"
              style={{ background: 'var(--color-accent)' }}
            >
              <Plus className="w-4 h-4" />
              {t('projects.newFolder')}
            </button>
            <button
              onClick={() => { setShowDocForm(true); setIsCreating(false) }}
              className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-90 hover:scale-[1.02] shadow-md border-2"
              style={{ background: 'var(--color-paper)', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
            >
              <FileText className="w-4 h-4" />
              {t('projects.newDocument')}
            </button>
          </div>
        </div>

        <ErrorMessage message={localError || error} />

        {isCreating && (
          <InlineCreateInput
            placeholder="Nombre de la carpeta..."
            onSubmit={handleCreateFolder}
            onCancel={() => setIsCreating(false)}
          />
        )}

        {showDocForm && (
          <div className="notebook-paper p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <select
                  value={selectedProjectId || ''}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm border appearance-none pr-8"
                  style={{
                    background: 'var(--color-background)',
                    borderColor: 'var(--color-paper-lines)',
                    color: 'var(--color-ink)',
                  }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-ink-faint)' }} />
              </div>
              <InlineCreateInput
                placeholder="Título del documento..."
                onSubmit={handleCreateDocument}
                onCancel={() => setShowDocForm(false)}
              />
            </div>
          </div>
        )}

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {projects.map((project) => (
              <div key={project.id} className="relative group">
                <Link
                  to={`/app/documents/${project.id}`}
                  className="notebook-paper p-4 block transition-all duration-200"
                >
                  <div className="notebook-lines absolute inset-0 opacity-10 rounded-xl"></div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--color-accent-light)' }}>
                      <FolderOpen className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
                    </div>
                    <h3 className="font-display text-lg font-bold truncate" style={{ color: 'var(--color-ink)' }}>
                      {project.name}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>
                      {t('projects.documentsCount', { count: project._count?.documents ?? 0 })}
                    </p>
                  </div>
                </Link>
                <div className="absolute top-2 right-2 z-20">
                  <KebabMenu onDelete={() => setDeleteTarget(project.id)} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          !isCreating && (
            <div className="notebook-paper p-8 md:p-12 relative">
              <div className="notebook-lines absolute inset-0 opacity-15 rounded-xl"></div>
              <div className="relative z-10 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute -top-2 -left-2 w-16 h-16 rounded-lg border-2 opacity-30" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)' }}></div>
                  <div className="absolute -top-1 -left-1 w-16 h-16 rounded-lg border-2 opacity-60" style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)' }}></div>
                  <div className="relative w-16 h-16 rounded-lg border-2 flex items-center justify-center" style={{ borderColor: 'var(--color-accent)', background: 'var(--color-accent-light)' }}>
                    <FolderOpen className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
                  </div>
                </div>
                <h3 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--color-ink)' }}>
                  No hay carpetas
                </h3>
                <p className="text-base mb-6 max-w-md mx-auto" style={{ color: 'var(--color-ink-light)' }}>
                  Crea tu primera carpeta para organizar tus historias
                </p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] shadow-md mx-auto"
                  style={{ background: 'var(--color-accent)' }}
                >
                  <Plus className="w-4 h-4" />
                  Crear Carpeta
                </button>
              </div>
              <div className="postit-pink absolute -bottom-3 -right-3 px-3 py-2 hidden md:block" style={{ transform: 'rotate(2deg)' }}>
                <span className="font-display text-sm font-bold">¡Empieza aquí!</span>
              </div>
            </div>
          )
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('projects.deleteProject')}
        message={t('projects.confirmDelete')}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (deleteTarget) deleteProject(deleteTarget)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <FolderCreationDialog
        projectName={createdProject?.name ?? ''}
        isOpen={createdProject !== null && !showWizard}
        onSkip={handleSkipWizard}
        onComplete={handleCompleteWizard}
        onClose={() => setCreatedProject(null)}
      />

      <StoryWizard
        projectId={createdProject?.id ?? ''}
        isOpen={showWizard && createdProject !== null}
        onClose={() => setShowWizard(false)}
        onSaved={handleWizardSaved}
      />
    </div>
  )
}
