import { MousePointer2, Hand, Pencil, Eraser, Square, Circle, Minus, Type, Undo2, Redo2, ImagePlus, ImageOff, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MapTool } from '@/types/maps'
import { MAP_COLOR_TOKENS, MAP_STROKE_WIDTHS } from './map-colors'

const TOOLS: { id: MapTool; icon: typeof MousePointer2 }[] = [
  { id: 'select', icon: MousePointer2 },
  { id: 'pan', icon: Hand },
  { id: 'draw', icon: Pencil },
  { id: 'erase', icon: Eraser },
  { id: 'rect', icon: Square },
  { id: 'ellipse', icon: Circle },
  { id: 'line', icon: Minus },
  { id: 'text', icon: Type },
]

interface MapToolbarProps {
  tool: MapTool
  color: string
  colors: string[]
  strokeWidth: number
  canUndo: boolean
  canRedo: boolean
  hasBackground: boolean
  saving: boolean
  onTool: (tool: MapTool) => void
  onColor: (color: string) => void
  onStrokeWidth: (width: number) => void
  onUndo: () => void
  onRedo: () => void
  onBackground: (file: File) => void
  onClearBackground: () => void
  onDelete: () => void
}

export function MapToolbar({
  tool,
  color,
  colors,
  strokeWidth,
  canUndo,
  canRedo,
  hasBackground,
  saving,
  onTool,
  onColor,
  onStrokeWidth,
  onUndo,
  onRedo,
  onBackground,
  onClearBackground,
  onDelete,
}: MapToolbarProps) {
  const { t } = useTranslation()

  return (
    <div className="map-toolbar" role="toolbar" aria-label={t('worldApp.mapTools')}>
      {TOOLS.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            className={`map-tool${tool === item.id ? ' is-selected' : ''}`}
            aria-label={t(`worldApp.mapTool.${item.id}`)}
            aria-pressed={tool === item.id}
            onClick={() => onTool(item.id)}
          >
            <Icon className="w-4 h-4" />
          </button>
        )
      })}
      <span aria-hidden className="mx-1 h-5 w-px" style={{ background: 'var(--color-paper-lines)' }} />
      {colors.map((value, index) => (
        <button
          key={MAP_COLOR_TOKENS[index] ?? value}
          type="button"
          className={`map-swatch${color === value ? ' is-selected' : ''}`}
          style={{ background: value }}
          aria-label={t('worldApp.mapColor')}
          aria-pressed={color === value}
          onClick={() => onColor(value)}
        />
      ))}
      {MAP_STROKE_WIDTHS.map((width) => (
        <button
          key={width}
          type="button"
          className={`map-width${strokeWidth === width ? ' is-selected' : ''}`}
          aria-label={t('worldApp.mapStrokeWidth', { width })}
          aria-pressed={strokeWidth === width}
          onClick={() => onStrokeWidth(width)}
        >
          {width}
        </button>
      ))}
      <button type="button" className="map-tool" aria-label={t('worldApp.mapUndo')} disabled={!canUndo} onClick={onUndo}>
        <Undo2 className="w-4 h-4" />
      </button>
      <button type="button" className="map-tool" aria-label={t('worldApp.mapRedo')} disabled={!canRedo} onClick={onRedo}>
        <Redo2 className="w-4 h-4" />
      </button>
      <label className="map-tool" aria-label={t('worldApp.mapBackground')}>
        <ImagePlus className="w-4 h-4" />
        <input
          className="sr-only map-workspace__file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onBackground(file)
            event.target.value = ''
          }}
        />
      </label>
      {hasBackground && (
        <button type="button" className="map-tool" aria-label={t('worldApp.mapClearBackground')} onClick={onClearBackground}>
          <ImageOff className="w-4 h-4" />
        </button>
      )}
      <button type="button" className="map-tool" aria-label={t('common.delete')} onClick={onDelete}>
        <Trash2 className="w-4 h-4" />
      </button>
      <span className="map-toolbar__status" data-state={saving ? 'loading' : 'success'}>
        {saving ? t('common.saving') : t('worldApp.mapSaved')}
      </span>
    </div>
  )
}
