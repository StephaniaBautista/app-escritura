import { SubplotSuggestions } from '@/components/ai/SubplotSuggestions'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GitBranch, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Subplot, SubplotStatus } from '@/types/structure'
import { useStructureStore } from '@/stores/structure-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LoadingState } from '@/components/ui/LoadingState'
import { SubplotDialog } from './SubplotDialog'

const STATUS_STYLES: Record<SubplotStatus, { color: string; background: string }> = {
  active: { color: 'var(--color-success, #16a34a)', background: 'var(--color-accent-light)' },
  resolved: { color: 'var(--color-info, #2563eb)', background: 'var(--color-accent-light)' },
  dropped: { color: 'var(--color-ink-faint)', background: 'var(--color-background)' },
}

function StatusBadge({ status }: { status: SubplotStatus }) {
  const { t } = useTranslation()
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.active
  return (
    <span
      className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: style.color, background: style.background }}
    >
      {t(`structureApp.status.${status}`)}
    </span>
  )
}

interface SubplotRowProps {
  subplot: Subplot
  onEdit: (subplot: Subplot) => void
  onDelete: (subplot: Subplot) => void
}

function SubplotRow({ subplot, onEdit, onDelete }: SubplotRowProps) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subplot.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className="notebook-paper p-4 flex items-center gap-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={t('structureApp.dragSubplot')}
        className="cursor-grab active:cursor-grabbing touch-none hover:opacity-70 flex-shrink-0"
        style={{ color: 'var(--color-ink-faint)' }}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      {subplot.color && (
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: subplot.color }} />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate" style={{ color: 'var(--color-ink)' }}>{subplot.title}</h3>
        {subplot.description && (
          <p className="text-sm mt-0.5 line-clamp-2" style={{ color: 'var(--color-ink-light)' }}>{subplot.description}</p>
        )}
      </div>
      <StatusBadge status={subplot.status} />
      <button
        type="button"
        onClick={() => onEdit(subplot)}
        aria-label={t('common.edit')}
        className="rounded p-1 hover:opacity-70 flex-shrink-0"
        style={{ color: 'var(--color-ink-light)' }}
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(subplot)}
        aria-label={t('common.delete')}
        className="rounded p-1 hover:opacity-70 flex-shrink-0"
        style={{ color: 'var(--color-danger, #dc2626)' }}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

export function SubplotsPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const { subplots, isLoadingSubplots, loadSubplots, reorderSubplots, removeSubplot } = useStructureStore()
  const [activeSubplot, setActiveSubplot] = useState<Subplot | null>(null)
  const [dialog, setDialog] = useState<{ subplot: Subplot | null } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Subplot | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    loadSubplots(projectId)
  }, [projectId, loadSubplots])

  const handleDragStart = (event: DragStartEvent) => {
    const found = subplots.find((subplot) => subplot.id === event.active.id)
    setActiveSubplot(found ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveSubplot(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = subplots.findIndex((subplot) => subplot.id === active.id)
    const newIndex = subplots.findIndex((subplot) => subplot.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    void reorderSubplots(projectId, arrayMove(subplots.map((subplot) => subplot.id), oldIndex, newIndex))
  }

  if (isLoadingSubplots && subplots.length === 0) {
    return <LoadingState label={t('common.loading')} className="notebook-paper" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
            <GitBranch className="w-6 h-6" style={{ color: 'var(--color-accent-violet)' }} />
            {t('structureApp.subplotsTitle')}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
            {t('structureApp.subplotsSubtitle')} · {subplots.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialog({ subplot: null })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus className="w-4 h-4" />
          {t('structureApp.newSubplot')}
        </button>
      </div>

      {subplots.length === 0 ? (
        <div className="notebook-paper p-10 text-center">
          <GitBranch className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-accent-violet)' }} />
          <p className="font-display text-lg" style={{ color: 'var(--color-ink-light)' }}>{t('structureApp.subplotsEmpty')}</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveSubplot(null)}
        >
          <div className="space-y-2">
            <SortableContext items={subplots.map((subplot) => subplot.id)} strategy={verticalListSortingStrategy}>
              {subplots.map((subplot) => (
                <SubplotRow
                  key={subplot.id}
                  subplot={subplot}
                  onEdit={(target) => setDialog({ subplot: target })}
                  onDelete={setDeleteTarget}
                />
              ))}
            </SortableContext>
          </div>
          <DragOverlay>
            {activeSubplot && (
              <div className="notebook-paper p-4 shadow-lg flex items-center gap-3">
                <GripVertical className="w-4 h-4" style={{ color: 'var(--color-ink-faint)' }} />
                <span className="font-medium" style={{ color: 'var(--color-ink)' }}>{activeSubplot.title}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <SubplotSuggestions key={projectId} projectId={projectId} />

      {dialog && (
        <SubplotDialog projectId={projectId} subplot={dialog.subplot} onClose={() => setDialog(null)} />
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('structureApp.deleteSubplotTitle')}
        message={t('structureApp.confirmDeleteSubplot', { name: deleteTarget?.title ?? '' })}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (deleteTarget) void removeSubplot(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
