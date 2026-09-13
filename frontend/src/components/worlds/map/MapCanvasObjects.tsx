import { Group, Line, Rect, Ellipse, Text, Path, Transformer } from 'react-konva'
import { useEffect, useRef, useState, type RefObject } from 'react'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import type { MapObject } from '@/types/maps'
import { getMapIcon, MAP_ICON_SIZE } from './map-icons'
import { readCssColor } from './map-colors'

interface MapCanvasObjectsProps {
  objects: MapObject[]
  selectedId: string | null
  tool: 'select' | 'erase' | string
  onSelect: (id: string | null) => void
  onChange: (object: MapObject) => void
  onErase: (id: string) => void
}

export function MapCanvasObjects({ objects, selectedId, tool, onSelect, onChange, onErase }: MapCanvasObjectsProps) {
  const transformerRef = useRef<Konva.Transformer>(null)
  const selectedRef = useRef<Konva.Node | null>(null)
  const [ink, setInk] = useState('#2c2416')
  const [paper, setPaper] = useState('#fffef9')

  useEffect(() => {
    setInk(readCssColor('--color-ink', '#2c2416'))
    setPaper(readCssColor('--color-paper', '#fffef9'))
  }, [])

  useEffect(() => {
    const transformer = transformerRef.current
    const node = selectedRef.current
    if (!transformer) return
    if (selectedId && node && tool === 'select') {
      transformer.nodes([node])
      transformer.getLayer()?.batchDraw()
      return
    }
    transformer.nodes([])
    transformer.getLayer()?.batchDraw()
  }, [selectedId, objects, tool])

  const setCursor = (event: KonvaEventObject<MouseEvent | TouchEvent>, cursor: string) => {
    const container = event.target.getStage()?.container()
    if (container) container.style.cursor = cursor
  }

  const bind = (id: string) => ({
    draggable: tool === 'select',
    onMouseDown: (event: KonvaEventObject<MouseEvent>) => {
      event.cancelBubble = true
      if (tool === 'erase') onErase(id)
    },
    onClick: (event: KonvaEventObject<MouseEvent>) => {
      event.cancelBubble = true
      if (tool === 'erase') onErase(id)
      else if (tool === 'select') onSelect(id)
    },
    onTap: (event: KonvaEventObject<TouchEvent>) => {
      event.cancelBubble = true
      if (tool === 'erase') onErase(id)
      else if (tool === 'select') onSelect(id)
    },
    onMouseEnter: (event: KonvaEventObject<MouseEvent>) => {
      if (tool === 'select') setCursor(event, 'grab')
      if (tool === 'erase') setCursor(event, 'cell')
    },
    onMouseLeave: (event: KonvaEventObject<MouseEvent>) => {
      setCursor(event, '')
    },
  })

  return (
    <>
      {objects.map((object) => (
        <ObjectNode
          key={object.id}
          object={object}
          selected={object.id === selectedId}
          bind={bind(object.id)}
          onNode={(node) => {
            if (object.id === selectedId) selectedRef.current = node
          }}
          onChange={onChange}
          onMoved={() => {
            if (tool === 'select') onSelect(object.id)
          }}
        />
      ))}
      <Transformer
        ref={transformerRef}
        rotateEnabled
        shouldOverdrawWholeArea
        enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
        borderStroke={ink}
        anchorStroke={ink}
        anchorFill={paper}
        anchorSize={8}
        padding={6}
      />
    </>
  )
}

interface ObjectNodeProps {
  object: MapObject
  selected: boolean
  bind: {
    draggable: boolean
    onMouseDown: (event: KonvaEventObject<MouseEvent>) => void
    onClick: (event: KonvaEventObject<MouseEvent>) => void
    onTap: (event: KonvaEventObject<TouchEvent>) => void
    onMouseEnter: (event: KonvaEventObject<MouseEvent>) => void
    onMouseLeave: (event: KonvaEventObject<MouseEvent>) => void
  }
  onNode: (node: Konva.Node | null) => void
  onChange: (object: MapObject) => void
  onMoved: () => void
}

function ObjectNode({ object, selected, bind, onNode, onChange, onMoved }: ObjectNodeProps) {
  const ref = useRef<Konva.Node>(null)

  useEffect(() => {
    onNode(selected ? ref.current : null)
  }, [selected, onNode])

  const finishTransform = () => {
    const node = ref.current
    if (!node) return
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    if (object.type === 'icon') {
      onChange({
        ...object,
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        width: Math.max(8, Math.abs(scaleX) * MAP_ICON_SIZE),
        height: Math.max(8, Math.abs(scaleY) * MAP_ICON_SIZE),
      })
      return
    }
    node.scaleX(1)
    node.scaleY(1)
    if (object.type === 'rect') {
      onChange({
        ...object,
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        width: Math.max(8, node.width() * Math.abs(scaleX)),
        height: Math.max(8, node.height() * Math.abs(scaleY)),
      })
      return
    }
    if (object.type === 'ellipse') {
      const ellipse = node as Konva.Ellipse
      const radiusX = Math.max(4, ellipse.radiusX() * Math.abs(scaleX))
      const radiusY = Math.max(4, ellipse.radiusY() * Math.abs(scaleY))
      onChange({
        ...object,
        x: node.x() - radiusX,
        y: node.y() - radiusY,
        width: radiusX * 2,
        height: radiusY * 2,
        rotation: node.rotation(),
      })
      return
    }
    if (object.type === 'text') {
      onChange({
        ...object,
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        width: Math.max(20, object.width * Math.abs(scaleX)),
      })
    }
  }

  const dragEnd = () => {
    const node = ref.current
    if (!node || object.type === 'path') return
    onChange({ ...object, x: node.x(), y: node.y() } as MapObject)
    onMoved()
  }

  if (object.type === 'icon') {
    const icon = getMapIcon(object.iconId)
    return (
      <Group
        ref={ref as RefObject<Konva.Group>}
        x={object.x}
        y={object.y}
        rotation={object.rotation}
        scaleX={object.width / MAP_ICON_SIZE}
        scaleY={object.height / MAP_ICON_SIZE}
        {...bind}
        onDragStart={(event) => {
          const container = event.target.getStage()?.container()
          if (container) container.style.cursor = 'grabbing'
        }}
        onDragEnd={dragEnd}
        onTransformEnd={finishTransform}
      >
        <Rect
          width={MAP_ICON_SIZE}
          height={MAP_ICON_SIZE}
          fill="black"
          sceneFunc={() => undefined}
          hitFunc={(ctx, shape) => {
            ctx.beginPath()
            ctx.rect(0, 0, MAP_ICON_SIZE, MAP_ICON_SIZE)
            ctx.closePath()
            ctx.fillStrokeShape(shape)
          }}
        />
        {icon && <Path data={icon.path} fill={object.stroke} listening={false} />}
      </Group>
    )
  }

  if (object.type === 'path') {
    return (
      <Line
        ref={ref as RefObject<Konva.Line>}
        points={object.points}
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
        lineCap="round"
        lineJoin="round"
        tension={0.2}
        {...bind}
        draggable={false}
      />
    )
  }

  if (object.type === 'rect') {
    return (
      <Rect
        ref={ref as RefObject<Konva.Rect>}
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        rotation={object.rotation}
        fill={object.fill === 'transparent' ? undefined : object.fill}
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
        {...bind}
        onDragEnd={dragEnd}
        onTransformEnd={finishTransform}
      />
    )
  }

  if (object.type === 'ellipse') {
    return (
      <Ellipse
        ref={ref as RefObject<Konva.Ellipse>}
        x={object.x + object.width / 2}
        y={object.y + object.height / 2}
        radiusX={object.width / 2}
        radiusY={object.height / 2}
        rotation={object.rotation}
        fill={object.fill === 'transparent' ? undefined : object.fill}
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
        {...bind}
        onDragEnd={(event) => {
          const node = event.target
          onChange({
            ...object,
            x: node.x() - object.width / 2,
            y: node.y() - object.height / 2,
          })
          onMoved()
        }}
        onTransformEnd={finishTransform}
      />
    )
  }

  if (object.type === 'line') {
    return (
      <Line
        ref={ref as RefObject<Konva.Line>}
        x={object.x}
        y={object.y}
        points={object.points}
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
        lineCap="round"
        {...bind}
        onDragEnd={dragEnd}
      />
    )
  }

  return (
    <Text
      ref={ref as RefObject<Konva.Text>}
      x={object.x}
      y={object.y}
      width={object.width}
      rotation={object.rotation}
      text={object.text}
      fontSize={object.fontSize}
      fill={object.fill}
      fontFamily="Caveat, cursive"
      {...bind}
      onDragEnd={dragEnd}
      onTransformEnd={finishTransform}
    />
  )
}
