import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Plus, Trash2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDocumentStore } from '@/stores/document-store'

interface ProjectTreeProps {
  activeProjectId: string | null
}

export function ProjectTree({ activeProjectId }: ProjectTreeProps) {
  const { projects, loadProjects, createProject, deleteProject, error } = useDocumentStore()
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setLocalError(null)
    try {
      const project = await createProject(newName.trim())
      setNewName('')
      setIsCreating(false)
      navigate(`/app/editor/${project.id}`)
    } catch (err: any) {
      setLocalError(err.message || 'Error al crear el proyecto')
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm('¿Eliminar este proyecto y todo su contenido?')) {
      await deleteProject(id)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-ink-faint)' }}>
          Proyectos
        </span>
        <button
          onClick={() => setIsCreating(true)}
          className="p-1 rounded hover:opacity-80"
          title="Nuevo proyecto"
        >
          <Plus className="w-3.5 h-3.5" style={{ color: 'var(--color-ink-light)' }} />
        </button>
      </div>

      {isCreating && (
        <div className="px-3 py-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') { setIsCreating(false); setNewName('') }
            }}
            placeholder="Nombre del proyecto..."
            className="w-full px-2 py-1.5 text-sm rounded border"
            style={{
              background: 'var(--color-background)',
              borderColor: 'var(--color-paper-lines)',
              color: 'var(--color-ink)',
            }}
            onBlur={() => { if (!newName.trim()) { setIsCreating(false) } }}
          />
        </div>
      )}

      {projects.map((project) => (
        <button
          key={project.id}
          onClick={() => navigate(`/app/editor/${project.id}`)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left group',
            activeProjectId === project.id
              ? 'font-medium'
              : 'hover:opacity-80'
          )}
          style={{
            color: activeProjectId === project.id ? 'var(--color-accent)' : 'var(--color-ink)',
            background: activeProjectId === project.id ? 'var(--color-accent-light)' : 'transparent',
          }}
        >
          <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }} />
          <span className="flex-1 truncate">{project.name}</span>
          <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
            {project._count?.documents ?? 0}
          </span>
          <button
            onClick={(e) => handleDelete(e, project.id)}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:opacity-80"
            title="Eliminar proyecto"
          >
            <Trash2 className="w-3 h-3" style={{ color: 'var(--color-ink-faint)' }} />
          </button>
        </button>
      ))}

      {projects.length === 0 && !isCreating && (
        <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-ink-faint)' }}>
          No hay proyectos
        </div>
      )}

      {(localError || error) && (
        <div className="mx-3 mt-2 flex items-center gap-2 text-xs p-2 rounded" style={{ background: '#fef2f2', color: '#991b1b' }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{localError || error}</span>
        </div>
      )}
    </div>
  )
}
