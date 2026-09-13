import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Map as MapIcon } from 'lucide-react'
import { InputDialog } from '@/components/ui/InputDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LoadingState } from '@/components/ui/LoadingState'
import { useMapStore } from '@/stores/map-store'
import { addObject, EMPTY_MAP_CANVAS, newMapObjectId, removeObject, type MapCanvas, type MapTool } from '@/types/maps'
import { commitHistory, initHistory, redoHistory, undoHistory } from './map-history'
import { MAP_COLOR_TOKENS, readCssColor } from './map-colors'
import { MapList } from './MapList'
import { MapToolbar } from './MapToolbar'
import { MapIconPalette } from './MapIconPalette'
import { MapCanvasView } from './MapCanvas'
import { getMapIcon, type MapIconCategory, type MapIconDef } from './map-icons'
import './map-workspace.css'

export function MapWorkspace({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const { maps, activeId, isLoading, isSaving, load, create, rename, saveCanvas, remove, uploadBackground, removeBackground, setActive } = useMapStore()
  const [tool, setTool] = useState<MapTool>('select')
  const [category, setCategory] = useState<MapIconCategory>('terrain')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [colors, setColors] = useState<string[]>(['#2c2416'])
  const [color, setColor] = useState('#2c2416')
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [history, setHistory] = useState(() => initHistory<MapCanvas>(EMPTY_MAP_CANVAS))
  const saveTimer = useRef<number | null>(null)
  const active = maps.find((item) => item.id === activeId) ?? null

  useEffect(() => {
    void load(projectId)
  }, [projectId, load])

  useEffect(() => {
    const resolved = MAP_COLOR_TOKENS.map((token) => readCssColor(token, '#2c2416'))
    setColors(resolved)
    setColor(resolved[0] ?? '#2c2416')
  }, [])

  useEffect(() => {
    if (!active) {
      setHistory(initHistory(EMPTY_MAP_CANVAS))
      return
    }
    setHistory(initHistory(active.canvas ?? EMPTY_MAP_CANVAS))
    setSelectedId(null)
  }, [active?.id])

  const persist = useCallback((id: string, canvas: MapCanvas) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      void saveCanvas(id, canvas)
    }, 700)
  }, [saveCanvas])

  const mutate = (fn: (canvas: MapCanvas) => MapCanvas) => {
    if (!active) return
    setHistory((prev) => {
      const canvas = fn(prev.present)
      persist(active.id, canvas)
      return commitHistory(prev, canvas)
    })
  }

  const handleUndo = () => {
    if (!active) return
    setHistory((prev) => {
      const next = undoHistory(prev)
      persist(active.id, next.present)
      return next
    })
  }

  const handleRedo = () => {
    if (!active) return
    setHistory((prev) => {
      const next = redoHistory(prev)
      persist(active.id, next.present)
      return next
    })
  }

  const stampIcon = (icon: MapIconDef, x = 180, y = 160) => {
    const id = newMapObjectId()
    mutate((canvas) => addObject(canvas, {
      id,
      type: 'icon',
      iconId: icon.id,
      x,
      y,
      width: 96,
      height: 96,
      rotation: 0,
      stroke: color,
    }))
    setSelectedId(id)
    setTool('select')
  }

  const handleBackground = (file: File) => {
    if (!active) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') void uploadBackground(active.id, reader.result)
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) handleRedo()
        else handleUndo()
      }
      if ((event.key === 'Backspace' || event.key === 'Delete') && selectedId && active) {
        const target = event.target
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
        mutate((canvas) => removeObject(canvas, selectedId))
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, active, history.present])

  const statusClass = useMemo(() => {
    if (isLoading) return ' is-loading'
    if (isSaving) return ''
    return ' is-success'
  }, [isLoading, isSaving])

  if (isLoading && maps.length === 0) {
    return <LoadingState label={t('common.loading')} />
  }

  if (!isLoading && maps.length === 0) {
    return (
      <div className="map-workspace is-empty">
        <div className="map-empty notebook-paper">
          <MapIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-accent-violet)' }} />
          <p className="map-empty__title">{t('worldApp.mapEmptyTitle')}</p>
          <p className="map-empty__copy">{t('worldApp.mapEmpty')}</p>
          <button type="button" className="map-list__new" onClick={() => setCreating(true)}>
            {t('worldApp.newMap')}
          </button>
        </div>
        <InputDialog
          isOpen={creating}
          title={t('worldApp.newMap')}
          placeholder={t('worldApp.mapNamePlaceholder')}
          confirmLabel={t('common.save')}
          onSubmit={async (name) => {
            await create(projectId, name)
            setCreating(false)
          }}
          onCancel={() => setCreating(false)}
        />
      </div>
    )
  }

  return (
    <div className={`map-workspace${statusClass}`}>
      <MapList
        maps={maps}
        activeId={activeId}
        onSelect={setActive}
        onCreate={() => setCreating(true)}
        onRename={setRenaming}
        onDelete={setDeleting}
      />
      <div className="map-stage">
        <MapToolbar
          tool={tool}
          color={color}
          colors={colors}
          strokeWidth={strokeWidth}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          hasBackground={Boolean(active?.backgroundUrl)}
          saving={isSaving}
          onTool={setTool}
          onColor={setColor}
          onStrokeWidth={setStrokeWidth}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onBackground={handleBackground}
          onClearBackground={() => { if (active) void removeBackground(active.id) }}
          onDelete={() => {
            if (!selectedId) return
            mutate((canvas) => removeObject(canvas, selectedId))
            setSelectedId(null)
          }}
        />
        {active && (
          <MapCanvasView
            map={active}
            canvas={history.present}
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCanvas={(canvas) => mutate(() => canvas)}
            onDropIcon={(iconId, x, y) => {
              const icon = getMapIcon(iconId)
              if (icon) stampIcon(icon, x, y)
            }}
          />
        )}
      </div>
      <MapIconPalette
        category={category}
        ink={color}
        onCategory={setCategory}
        onPick={(icon) => stampIcon(icon)}
      />

      <InputDialog
        isOpen={creating}
        title={t('worldApp.newMap')}
        placeholder={t('worldApp.mapNamePlaceholder')}
        confirmLabel={t('common.save')}
        onSubmit={async (name) => {
          await create(projectId, name)
          setCreating(false)
        }}
        onCancel={() => setCreating(false)}
      />
      <InputDialog
        isOpen={renaming !== null}
        title={t('worldApp.renameMap')}
        placeholder={t('worldApp.mapNamePlaceholder')}
        initialValue={maps.find((item) => item.id === renaming)?.name}
        confirmLabel={t('common.save')}
        onSubmit={async (name) => {
          if (renaming) await rename(renaming, name)
          setRenaming(null)
        }}
        onCancel={() => setRenaming(null)}
      />
      <ConfirmDialog
        isOpen={deleting !== null}
        title={t('worldApp.deleteMapTitle')}
        message={t('worldApp.confirmDeleteMap')}
        confirmLabel={t('common.delete')}
        onConfirm={async () => {
          if (deleting) await remove(deleting)
          setDeleting(null)
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
