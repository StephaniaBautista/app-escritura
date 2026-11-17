import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GitBranch } from 'lucide-react'
import { useStructureStore } from '@/stores/structure-store'
import { countVisibleSubplots } from '@/lib/subplot-visibility'
import { SubplotsLayerPanel } from './SubplotsLayerPanel'
import './subplot-layer.css'

interface SubplotsLayerButtonProps {
  projectId: string
  align?: 'start' | 'end'
}

export function SubplotsLayerButton({ projectId, align = 'end' }: SubplotsLayerButtonProps) {
  const { t } = useTranslation()
  const subplots = useStructureStore((state) => state.subplots)
  const hiddenSubplotIds = useStructureStore((state) => state.hiddenSubplotIds)
  const loadSubplots = useStructureStore((state) => state.loadSubplots)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    void loadSubplots(projectId)
  }, [projectId, loadSubplots])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const visible = countVisibleSubplots(subplots, hiddenSubplotIds)

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        data-testid="subplots-layer-button"
        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          borderColor: open ? 'var(--color-accent-violet)' : 'var(--color-paper-lines)',
          color: 'var(--color-ink)',
          background: 'var(--color-paper)',
          outlineColor: 'var(--color-accent-violet)',
        }}
      >
        <GitBranch className="h-4 w-4 shrink-0" style={{ color: 'var(--color-accent-violet)' }} />
        {t('structureApp.subplotsLayer')}
        <span className="subplot-layer__badge" aria-label={t('structureApp.subplotsVisibleCount', { visible, total: subplots.length })}>
          {visible}/{subplots.length}
        </span>
      </button>
      {open && (
        <div id={panelId} role="dialog" aria-label={t('structureApp.subplotsTitle')} data-align={align} className="subplot-layer__pop">
          <SubplotsLayerPanel projectId={projectId} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}
