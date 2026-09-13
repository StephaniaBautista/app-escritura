export type MapObjectType = 'icon' | 'path' | 'rect' | 'ellipse' | 'line' | 'text'

export interface MapIconObject {
  id: string
  type: 'icon'
  iconId: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  stroke: string
}

export interface MapPathObject {
  id: string
  type: 'path'
  points: number[]
  stroke: string
  strokeWidth: number
}

export interface MapRectObject {
  id: string
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  fill: string
  stroke: string
  strokeWidth: number
}

export interface MapEllipseObject {
  id: string
  type: 'ellipse'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  fill: string
  stroke: string
  strokeWidth: number
}

export interface MapLineObject {
  id: string
  type: 'line'
  x: number
  y: number
  points: [number, number, number, number]
  stroke: string
  strokeWidth: number
}

export interface MapTextObject {
  id: string
  type: 'text'
  x: number
  y: number
  width: number
  rotation: number
  text: string
  fontSize: number
  fill: string
}

export type MapObject =
  | MapIconObject
  | MapPathObject
  | MapRectObject
  | MapEllipseObject
  | MapLineObject
  | MapTextObject

export interface MapCanvas {
  version: 1
  objects: MapObject[]
}

export interface MapBoard {
  id: string
  projectId: string
  name: string
  backgroundUrl: string | null
  canvas: MapCanvas
  order: number
  createdAt: string
  updatedAt: string
}

export interface MapBoardInput {
  name?: string
  canvas?: MapCanvas
}

export const EMPTY_MAP_CANVAS: MapCanvas = { version: 1, objects: [] }

export type MapTool = 'select' | 'pan' | 'draw' | 'erase' | 'rect' | 'ellipse' | 'line' | 'text'

export function newMapObjectId(): string {
  return crypto.randomUUID()
}

export function replaceObject(canvas: MapCanvas, next: MapObject): MapCanvas {
  return { ...canvas, objects: canvas.objects.map((item) => (item.id === next.id ? next : item)) }
}

export function addObject(canvas: MapCanvas, object: MapObject): MapCanvas {
  return { ...canvas, objects: [...canvas.objects, object] }
}

export function removeObject(canvas: MapCanvas, id: string): MapCanvas {
  return { ...canvas, objects: canvas.objects.filter((item) => item.id !== id) }
}

export function bringToFront(canvas: MapCanvas, id: string): MapCanvas {
  const target = canvas.objects.find((item) => item.id === id)
  if (!target) return canvas
  return { ...canvas, objects: [...canvas.objects.filter((item) => item.id !== id), target] }
}
