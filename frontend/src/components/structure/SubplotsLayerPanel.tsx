import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, GitBranch, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { Subplot, SubplotStatus } from '@/types/structure'
import { useStructureStore } from '@/stores/structure-store'
import { isSubplotVisible, subplotLayerColor } from '@/lib/subplot-visibility'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SubplotSuggestions } from '@/components/ai/SubplotSuggestions'
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
      className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: style.color, background: style.background }}
    >
      {t(`structureApp.status.${status}`)}
    </span>
  )
}

interface SubplotRowProps {
  subplot: Subplot
  visible: boolean
  onToggle: (subplot: Subplot) => void
  onEdit: (subplot: Subplot) => void
  onDelete: (subplot: Subplot) => void
}

function SubplotRow({ subplot, visible, onToggle, onEdit, onDelete }: SubplotRowProps) {
  const { t } = useTranslation()
  const color = subplotLayerColor(subplot)
  return (
    <li
      className="flex items-center gap-2 rounded-lg border px-2 py-2 transition-opacity"
      style={{ borderColor: visible ? color : 'var(--color-paper-lines)', opacity: visible ? 1 : 0.6 }}
      data-testid={`subplot-row-${subplot.id}`}
    >
      <button
        type="button"
        onClick={() => onToggle(subplot)}
        aria-pressed={visible}
        aria-label={t(visible ? 'structureApp.hideSubplot' : 'structureApp.showSubplot', { name: subplot.title })}
        className="rounded p-1 hover:opacity-70 shrink-0"
        style={{ color: visible ? color : 'var(--color-ink-faint)' }}
      >
        {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{subplot.title}</p>
        {subplot.description && (
          <p className="truncate text-xs" style={{ color: 'var(--color-ink-faint)' }}>{subplot.description}</p>
        )}
      </div>
      <StatusBadge status={subplot.status} />
      <button type="button" onClick={() => onEdit(subplot)} aria-label={t('common.edit')} className="rounded p-1 hover:opacity-70 shrink-0" style={{ color: 'var(--color-ink-light)' }}>
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => onDelete(subplot)} aria-label={t('common.delete')} className="rounded p-1 hover:opacity-70 shrink-0" style={{ color: 'var(--color-danger, #dc2626)' }}>
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  )
}

interface SubplotsLayerPanelProps {
  projectId: string
  onClose: () => void
}

export function SubplotsLayerPanel({ projectId, onClose }: SubplotsLayerPanelProps) {
  const { t } = useTranslation()
  const subplots = useStructureStore((state) => state.subplots)
  const hiddenSubplotIds = useStructureStore((state) => state.hiddenSubplotIds)
  const isLoading = useStructureStore((state) => state.isLoadingSubplots)
  const { toggleSubplotVisibility, setAllSubplotsVisible, removeSubplot } = useStructureStore()
  const [dialog, setDialog] = useState<{ subplot: Subplot | null } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Subplot | null>(null)
  const allVisible = hiddenSubplotIds.length === 0
  const linkClass = 'text-xs font-medium underline-offset-2 hover:underline disabled:opacity-40'

  return (
    <div className="p-3 space-y-3" data-testid="subplots-layer-panel">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
            <GitBranch className="h-4 w-4" style={{ color: 'var(--color-accent-violet)' }} />
            {t('structureApp.subplotsTitle')}
          </h3>
          <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>{t('structureApp.subplotLayerHint')}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="rounded p-1 hover:opacity-70 shrink-0" style={{ color: 'var(--color-ink-light)' }}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {subplots.length > 0 && (
        <div className="flex items-center gap-3">
          <button type="button" disabled={allVisible} onClick={() => setAllSubplotsVisible(true)} className={linkClass} style={{ color: 'var(--color-accent-violet)' }}>
            {t('structureApp.showAllSubplots')}
          </button>
          <button type="button" disabled={hiddenSubplotIds.length === subplots.length} onClick={() => setAllSubplotsVisible(false)} className={linkClass} style={{ color: 'var(--color-ink-light)' }}>
            {t('structureApp.hideAllSubplots')}
          </button>
        </div>
      )}

      {subplots.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm" style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}>
          {isLoading ? t('common.loading') : t('structureApp.subplotsEmpty')}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {subplots.map((subplot) => (
            <SubplotRow
              key={subplot.id}
              subplot={subplot}
              visible={isSubplotVisible(subplot.id, hiddenSubplotIds)}
              onToggle={(target) => toggleSubplotVisibility(target.id)}
              onEdit={(target) => setDialog({ subplot: target })}
              onDelete={setDeleteTarget}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setDialog({ subplot: null })}
        className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
        style={{ background: 'var(--color-accent)' }}
      >
        <Plus className="h-4 w-4" />
        {t('structureApp.newSubplot')}
      </button>

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
