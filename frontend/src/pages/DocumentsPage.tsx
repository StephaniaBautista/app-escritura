import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentStore } from '@/stores/document-store'
import { useActivityStore } from '@/stores/activity-store'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { InlineCreateInput } from '@/components/ui/InlineCreateInput'
import { Plus, FolderOpen } from 'lucide-react'

export function DocumentsPage() {
  const { projects, loadProjects, createProject, error } = useDocumentStore()
  const { addActivity } = useActivityStore()
  const [isCreating, setIsCreating] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleCreate = async (name: string) => {
    setLocalError(null)
    try {
      const project = await createProject(name)
      addActivity({
        type: 'folder_created',
        title: name,
        folderId: project.id,
      })
      setIsCreating(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear la carpeta'
      setLocalError(message)
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-4xl font-bold" style={{ color: 'var(--color-ink)' }}>Mis proyectos</h1>
            <p className="text-lg" style={{ color: 'var(--color-ink-light)' }}>Organiza tus historias</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] shadow-md"
            style={{ background: 'var(--color-accent)' }}
          >
            <Plus className="w-4 h-4" />
            Nueva Carpeta
          </button>
        </div>

        <ErrorMessage message={localError || error} />

        {isCreating && (
          <InlineCreateInput
            placeholder="Nombre de la carpeta..."
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
          />
        )}

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/app/documents/${project.id}`}
                className="notebook-paper p-4 relative group hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
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
                    {project._count?.documents ?? 0} documentos
                  </p>
                </div>
              </Link>
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
    </div>
  )
}
