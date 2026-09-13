import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { KanbanSquare, Plus, RefreshCw } from 'lucide-react'
import type { StructureCard, StructureColumn } from '@/types/structure'
import { useStructureStore } from '@/stores/structure-store'
import { useAiStore } from '@/stores/ai-store'
import { countUnlinkedChapters } from '@/lib/structure-chapters'
import { StructureSuggestions } from '@/components/ai/StructureSuggestions'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LoadingState } from '@/components/ui/LoadingState'
import { BoardColumn } from './BoardColumn'
import { CardDialog } from './CardDialog'
import { ColumnDialog } from './ColumnDialog'

type DragData =
  | { type: 'card'; card: StructureCard }
  | { type: 'column'; column: StructureColumn }

function getDragData(data: unknown): DragData | null {
  if (typeof data !== 'object' || data === null) return null
  const candidate = data as Record<string, unknown>
  if (candidate.type === 'card' && typeof candidate.card === 'object' && candidate.card !== null) {
    return { type: 'card', card: candidate.card as StructureCard }
  }
  if (candidate.type === 'column' && typeof candidate.column === 'object' && candidate.column !== null) {
    return { type: 'column', column: candidate.column as StructureColumn }
  }
  return null
}

export function BoardPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const { boards, activeBoardId, isLoadingBoards, loadBoards, reorderColumns, moveCard, removeColumn, syncChapters } = useStructureStore()
  const chapters = useAiStore((state) => state.capabilities?.chapters)
  const chapterIds = useMemo(
    () => chapters?.map((chapter) => chapter.id) ?? [],
    [chapters],
  )
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [columnDialog, setColumnDialog] = useState<{ column: StructureColumn | null } | null>(null)
  const [deleteColumnTarget, setDeleteColumnTarget] = useState<StructureColumn | null>(null)
  const [cardDialog, setCardDialog] = useState<{ columnId: string; card: StructureCard | null } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    loadBoards(projectId)
  }, [projectId, loadBoards])

  useEffect(() => {
    void useAiStore.getState().loadCapabilities(projectId)
  }, [projectId])

  const board = boards.find((b) => b.id === activeBoardId) ?? boards[0] ?? null
  const columns = board?.columns ?? []
  const pendingChapters = board ? countUnlinkedChapters(board, chapterIds) : 0

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDrag(getDragData(event.active.data.current))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null)
    const { active, over } = event
    if (!over || !board) return
    const activeData = getDragData(active.data.current)
    const overData = getDragData(over.data.current)
    if (!activeData) return

    if (activeData.type === 'column') {
      const overColumnId = overData?.type === 'column'
        ? overData.column.id
        : overData?.type === 'card'
          ? overData.card.columnId
          : null
      if (!overColumnId) return
      const oldIndex = columns.findIndex((column) => column.id === activeData.column.id)
      const newIndex = columns.findIndex((column) => column.id === overColumnId)
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return
      void reorderColumns(board.id, arrayMove(columns.map((column) => column.id), oldIndex, newIndex))
      return
    }

    const { card } = activeData
    if (overData?.type === 'card') {
      const overCard = overData.card
      if (overCard.id === card.id) return
      const target = columns.find((column) => column.id === overCard.columnId)
      if (!target) return
      const overIndex = (target.cards ?? []).findIndex((item) => item.id === overCard.id)
      if (overIndex < 0) return
      if (card.columnId === overCard.columnId) {
        const oldIndex = (target.cards ?? []).findIndex((item) => item.id === card.id)
        if (oldIndex === overIndex) return
      }
      void moveCard(card.id, overCard.columnId, overIndex)
      return
    }
    if (overData?.type === 'column') {
      const target = columns.find((column) => column.id === overData.column.id)
      if (!target) return
      const targetCards = target.cards ?? []
      if (card.columnId === target.id && targetCards[targetCards.length - 1]?.id === card.id) return
      const toIndex = card.columnId === target.id ? targetCards.length - 1 : targetCards.length
      void moveCard(card.id, target.id, Math.max(0, toIndex))
    }
  }

  if (isLoadingBoards && boards.length === 0) {
    return <LoadingState label={t('common.loading')} className="notebook-paper" />
  }

  const toolbarSecondaryClass =
    'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50'
  const toolbarSecondaryStyle = {
    borderColor: 'var(--color-paper-lines)',
    color: 'var(--color-ink)',
    background: 'var(--color-paper)',
  } as const

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
            <KanbanSquare className="w-6 h-6 shrink-0" style={{ color: 'var(--color-accent-violet)' }} />
            {t('structureApp.boardTitle')}
          </h2>
          <p className="text-sm mt-0.5 max-w-2xl" style={{ color: 'var(--color-ink-faint)' }}>
            {t('structureApp.boardSubtitle')}
          </p>
        </div>
        {board && (
          <div
            className="flex flex-wrap items-center justify-between gap-2"
            data-testid="structure-board-toolbar"
          >
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              {pendingChapters > 0 && (
                <button
                  type="button"
                  disabled={syncing}
                  onClick={() => {
                    setSyncing(true)
                    void syncChapters(board.id).finally(() => setSyncing(false))
                  }}
                  className={toolbarSecondaryClass}
                  style={toolbarSecondaryStyle}
                >
                  <RefreshCw
                    className={`w-4 h-4 shrink-0 ${syncing ? 'animate-spin' : ''}`}
                    style={{ color: 'var(--color-accent)' }}
                  />
                  {t(syncing ? 'structureApp.syncing' : 'structureApp.syncChapters', { count: pendingChapters })}
                </button>
              )}
              <StructureSuggestions projectId={projectId} board={board} />
            </div>
            <button
              type="button"
              onClick={() => setColumnDialog({ column: null })}
              className="flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ background: 'var(--color-accent)' }}
            >
              <Plus className="w-4 h-4 shrink-0" />
              {t('structureApp.addColumn')}
            </button>
          </div>
        )}
      </div>

      {board && (
        <div className="overflow-x-auto pb-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveDrag(null)}
          >
            <div className="flex gap-3 items-start min-w-max min-h-64">
              <SortableContext items={columns.map((column) => column.id)} strategy={horizontalListSortingStrategy}>
                {columns.map((column) => (
                  <BoardColumn
                    key={column.id}
                    column={column}
                    onAddCard={(columnId) => setCardDialog({ columnId, card: null })}
                    onEditCard={(card) => setCardDialog({ columnId: card.columnId, card })}
                    onRenameColumn={(target) => setColumnDialog({ column: target })}
                    onDeleteColumn={setDeleteColumnTarget}
                  />
                ))}
              </SortableContext>
            </div>
            <DragOverlay>
              {activeDrag?.type === 'card' && (
                <div
                  className="rounded-lg border p-3 shadow-lg w-64"
                  style={{ background: 'var(--color-paper)', borderColor: 'var(--color-accent)' }}
                >
                  <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{activeDrag.card.title}</p>
                </div>
              )}
              {activeDrag?.type === 'column' && (
                <div
                  className="rounded-xl border px-4 py-3 shadow-lg w-72"
                  style={{ background: 'var(--color-background)', borderColor: 'var(--color-accent)' }}
                >
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{activeDrag.column.name}</p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {columnDialog && board && (
        <ColumnDialog boardId={board.id} column={columnDialog.column} onClose={() => setColumnDialog(null)} />
      )}

      {cardDialog && (
        <CardDialog columnId={cardDialog.columnId} card={cardDialog.card} onClose={() => setCardDialog(null)} />
      )}

      <ConfirmDialog
        isOpen={deleteColumnTarget !== null}
        title={t('structureApp.deleteColumnTitle')}
        message={t('structureApp.confirmDeleteColumn', {
          name: deleteColumnTarget?.name ?? '',
          count: deleteColumnTarget?.cards?.length ?? 0,
        })}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (deleteColumnTarget) void removeColumn(deleteColumnTarget.id)
          setDeleteColumnTarget(null)
        }}
        onCancel={() => setDeleteColumnTarget(null)}
      />
    </div>
  )
}
