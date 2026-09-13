import { useEffect, useRef, useState } from 'react'
import { Image as KonvaImage, Layer, Line, Rect, Stage } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import type { MapBoard, MapCanvas as MapCanvasDoc, MapObject, MapTool } from '@/types/maps'
import { addObject, newMapObjectId, removeObject, replaceObject } from '@/types/maps'
import { MapCanvasObjects } from './MapCanvasObjects'
import { getMapIcon } from './map-icons'
import { readCssColor } from './map-colors'

export const MAP_WORLD = { width: 2400, height: 1600 }

interface MapCanvasProps {
  map: MapBoard
  canvas: MapCanvasDoc
  tool: MapTool
  color: string
  strokeWidth: number
  selectedId: string | null
  onSelect: (id: string | null) => void
  onCanvas: (canvas: MapCanvasDoc) => void
  onDropIcon: (iconId: string, x: number, y: number) => void
}

export function MapCanvasView({ map, canvas, tool, color, strokeWidth, selectedId, onSelect, onCanvas, onDropIcon }: MapCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ width: 800, height: 512 })
  const [pan, setPan] = useState({ x: 48, y: 36, scale: 0.55 })
  const [draft, setDraft] = useState<number[] | null>(null)
  const [background, setBackground] = useState<HTMLImageElement | null>(null)
  const [paper, setPaper] = useState('#fffef9')
  const drawing = useRef(false)
  const draftRef = useRef<number[] | null>(null)
  const panning = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const shapeStart = useRef<{ x: number; y: number } | null>(null)

  const setDraftBoth = (value: number[] | null) => {
    draftRef.current = value
    setDraft(value)
  }

  useEffect(() => {
    setPaper(readCssColor('--color-background', '#f5f0e8'))
    const host = hostRef.current
    if (!host) return
    const observer = new ResizeObserver(() => {
      setSize({ width: host.clientWidth, height: host.clientHeight })
    })
    observer.observe(host)
    setSize({ width: host.clientWidth, height: host.clientHeight })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!map.backgroundUrl) {
      setBackground(null)
      return
    }
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => setBackground(image)
    image.src = map.backgroundUrl
  }, [map.backgroundUrl])

  const worldPoint = () => {
    const pointer = stageRef.current?.getPointerPosition()
    if (!pointer) return null
    return {
      x: (pointer.x - pan.x) / pan.scale,
      y: (pointer.y - pan.y) / pan.scale,
    }
  }

  const onMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    const isStage = event.target === event.target.getStage()
    if (!isStage && tool === 'select') return
    const point = worldPoint()
    if (!point) return
    if (tool === 'select' && isStage) onSelect(null)
    if (tool === 'pan') {
      panning.current = { x: event.evt.clientX, y: event.evt.clientY, panX: pan.x, panY: pan.y }
      return
    }
    if (tool === 'draw') {
      drawing.current = true
      setDraftBoth([point.x, point.y])
      return
    }
    if (tool === 'rect' || tool === 'ellipse' || tool === 'line') {
      shapeStart.current = point
      setDraftBoth([point.x, point.y, point.x, point.y])
    }
    if (tool === 'text') {
      onCanvas(addObject(canvas, {
        id: newMapObjectId(),
        type: 'text',
        x: point.x,
        y: point.y,
        width: 220,
        rotation: 0,
        text: '…',
        fontSize: 28,
        fill: color,
      }))
    }
  }

  const onMouseMove = (event: KonvaEventObject<MouseEvent>) => {
    if (tool === 'pan' && panning.current) {
      const origin = panning.current
      setPan((prev) => ({
        ...prev,
        x: origin.panX + event.evt.clientX - origin.x,
        y: origin.panY + event.evt.clientY - origin.y,
      }))
      return
    }
    const point = worldPoint()
    if (!point) return
    if (tool === 'draw' && drawing.current) {
      const next = [...(draftRef.current ?? []), point.x, point.y]
      setDraftBoth(next)
      return
    }
    if (shapeStart.current) {
      setDraftBoth([shapeStart.current.x, shapeStart.current.y, point.x, point.y])
    }
  }

  const finishDraft = () => {
    const hadDraft = drawing.current || Boolean(shapeStart.current)
    const wasPanning = Boolean(panning.current)
    const points = draftRef.current
    drawing.current = false
    panning.current = null
    const start = shapeStart.current
    shapeStart.current = null
    if (wasPanning || !hadDraft || !points) {
      setDraftBoth(null)
      return
    }
    if (tool === 'draw' && points.length >= 4) {
      onCanvas(addObject(canvas, { id: newMapObjectId(), type: 'path', points, stroke: color, strokeWidth }))
    }
    if ((tool === 'rect' || tool === 'ellipse') && start) {
      onCanvas(addObject(canvas, {
        id: newMapObjectId(),
        type: tool,
        x: Math.min(points[0], points[2]),
        y: Math.min(points[1], points[3]),
        width: Math.max(8, Math.abs(points[2] - points[0])),
        height: Math.max(8, Math.abs(points[3] - points[1])),
        rotation: 0,
        fill: 'transparent',
        stroke: color,
        strokeWidth,
      }))
    }
    if (tool === 'line' && points.length === 4) {
      onCanvas(addObject(canvas, {
        id: newMapObjectId(),
        type: 'line',
        x: 0,
        y: 0,
        points: [points[0], points[1], points[2], points[3]],
        stroke: color,
        strokeWidth,
      }))
    }
    setDraftBoth(null)
  }

  const onWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault()
    const pointer = stageRef.current?.getPointerPosition()
    if (!pointer) return
    const nextScale = Math.min(2.4, Math.max(0.12, pan.scale * (event.evt.deltaY > 0 ? 0.92 : 1.08)))
    setPan({
      scale: nextScale,
      x: pointer.x - ((pointer.x - pan.x) / pan.scale) * nextScale,
      y: pointer.y - ((pointer.y - pan.y) / pan.scale) * nextScale,
    })
  }

  return (
    <div
      ref={hostRef}
      className={`map-canvas-host is-${tool}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        const iconId = event.dataTransfer.getData('application/x-map-icon')
        if (!iconId || !getMapIcon(iconId)) return
        const bounds = hostRef.current?.getBoundingClientRect()
        if (!bounds) return
        onDropIcon(
          iconId,
          (event.clientX - bounds.left - pan.x) / pan.scale,
          (event.clientY - bounds.top - pan.y) / pan.scale,
        )
      }}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={pan.x}
        y={pan.y}
        scaleX={pan.scale}
        scaleY={pan.scale}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={finishDraft}
        onMouseLeave={finishDraft}
        onWheel={onWheel}
      >
        <Layer>
          <Rect x={0} y={0} width={MAP_WORLD.width} height={MAP_WORLD.height} fill={paper} opacity={0.55} listening={false} />
          {background && (
            <KonvaImage image={background} x={0} y={0} width={MAP_WORLD.width} height={MAP_WORLD.height} opacity={0.55} listening={false} />
          )}
          <MapCanvasObjects
            objects={canvas.objects}
            selectedId={selectedId}
            tool={tool}
            onSelect={onSelect}
            onChange={(object: MapObject) => onCanvas(replaceObject(canvas, object))}
            onErase={(id) => {
              onCanvas(removeObject(canvas, id))
              onSelect(null)
            }}
          />
          {draft && (tool === 'draw' || tool === 'line') && (
            <Line points={draft} stroke={color} strokeWidth={strokeWidth} lineCap="round" lineJoin="round" listening={false} />
          )}
          {draft && (tool === 'rect' || tool === 'ellipse') && (
            <Rect
              x={Math.min(draft[0], draft[2])}
              y={Math.min(draft[1], draft[3])}
              width={Math.abs(draft[2] - draft[0])}
              height={Math.abs(draft[3] - draft[1])}
              stroke={color}
              strokeWidth={strokeWidth}
              dash={[8, 6]}
              cornerRadius={tool === 'ellipse' ? 999 : 0}
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}
