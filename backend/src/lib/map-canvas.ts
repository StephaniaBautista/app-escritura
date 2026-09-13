export const MAP_CANVAS_VERSION = 1
export const MAX_MAP_OBJECTS = 600
export const MAX_PATH_POINTS = 2500
export const MAX_TEXT_CHARS = 2000
export const MAX_CANVAS_BYTES = 700_000

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/
const ICON_RE = /^[a-z0-9-]{1,40}$/
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

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
  version: typeof MAP_CANVAS_VERSION
  objects: MapObject[]
}

export const EMPTY_MAP_CANVAS: MapCanvas = { version: MAP_CANVAS_VERSION, objects: [] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function num(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function hex(value: unknown, fallback: string): string {
  if (value === 'transparent' || value === '') return 'transparent'
  if (typeof value === 'string' && HEX_RE.test(value)) return value
  return fallback
}

function idOf(value: unknown): string | null {
  if (typeof value !== 'string' || !ID_RE.test(value)) return null
  return value
}

function sanitizeObject(raw: unknown): MapObject | null {
  if (!isRecord(raw)) return null
  const id = idOf(raw.id)
  if (!id) return null
  const type = raw.type

  if (type === 'icon') {
    if (typeof raw.iconId !== 'string' || !ICON_RE.test(raw.iconId)) return null
    return {
      id,
      type: 'icon',
      iconId: raw.iconId,
      x: num(raw.x, -20000, 20000, 0),
      y: num(raw.y, -20000, 20000, 0),
      width: num(raw.width, 8, 800, 64),
      height: num(raw.height, 8, 800, 64),
      rotation: num(raw.rotation, -360, 360, 0),
      stroke: hex(raw.stroke, '#2c2416'),
    }
  }

  if (type === 'path') {
    if (!Array.isArray(raw.points) || raw.points.length < 4 || raw.points.length > MAX_PATH_POINTS * 2) return null
    if (raw.points.length % 2 !== 0) return null
    const points: number[] = []
    for (const point of raw.points) {
      if (typeof point !== 'number' || !Number.isFinite(point)) return null
      points.push(num(point, -20000, 20000, 0))
    }
    return {
      id,
      type: 'path',
      points,
      stroke: hex(raw.stroke, '#2c2416'),
      strokeWidth: num(raw.strokeWidth, 1, 40, 3),
    }
  }

  if (type === 'rect' || type === 'ellipse') {
    return {
      id,
      type,
      x: num(raw.x, -20000, 20000, 0),
      y: num(raw.y, -20000, 20000, 0),
      width: num(raw.width, 4, 4000, 80),
      height: num(raw.height, 4, 4000, 80),
      rotation: num(raw.rotation, -360, 360, 0),
      fill: hex(raw.fill, 'transparent'),
      stroke: hex(raw.stroke, '#2c2416'),
      strokeWidth: num(raw.strokeWidth, 0, 40, 2),
    }
  }

  if (type === 'line') {
    const pts = raw.points
    if (!Array.isArray(pts) || pts.length !== 4) return null
    if (pts.some((p) => typeof p !== 'number' || !Number.isFinite(p))) return null
    return {
      id,
      type: 'line',
      x: num(raw.x, -20000, 20000, 0),
      y: num(raw.y, -20000, 20000, 0),
      points: [
        num(pts[0], -20000, 20000, 0),
        num(pts[1], -20000, 20000, 0),
        num(pts[2], -20000, 20000, 0),
        num(pts[3], -20000, 20000, 0),
      ],
      stroke: hex(raw.stroke, '#2c2416'),
      strokeWidth: num(raw.strokeWidth, 1, 40, 3),
    }
  }

  if (type === 'text') {
    if (typeof raw.text !== 'string') return null
    return {
      id,
      type: 'text',
      x: num(raw.x, -20000, 20000, 0),
      y: num(raw.y, -20000, 20000, 0),
      width: num(raw.width, 20, 2000, 200),
      rotation: num(raw.rotation, -360, 360, 0),
      text: raw.text.slice(0, MAX_TEXT_CHARS),
      fontSize: num(raw.fontSize, 8, 96, 22),
      fill: hex(raw.fill, '#2c2416'),
    }
  }

  return null
}

export function sanitizeMapCanvas(input: unknown): { canvas: MapCanvas } | { error: string } {
  if (input === undefined || input === null) return { canvas: EMPTY_MAP_CANVAS }
  if (!isRecord(input)) return { error: 'CANVAS_INVALID' }
  const objectsRaw = input.objects
  if (objectsRaw !== undefined && !Array.isArray(objectsRaw)) return { error: 'CANVAS_INVALID' }
  if (Array.isArray(objectsRaw) && objectsRaw.length > MAX_MAP_OBJECTS) return { error: 'CANVAS_TOO_LARGE' }

  const seen = new Set<string>()
  const objects: MapObject[] = []
  for (const item of objectsRaw ?? []) {
    const obj = sanitizeObject(item)
    if (!obj) continue
    if (seen.has(obj.id)) continue
    seen.add(obj.id)
    objects.push(obj)
  }

  const canvas: MapCanvas = { version: MAP_CANVAS_VERSION, objects }
  if (JSON.stringify(canvas).length > MAX_CANVAS_BYTES) return { error: 'CANVAS_TOO_LARGE' }
  return { canvas }
}
