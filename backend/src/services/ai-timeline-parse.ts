import { AiServiceError, type AiValidationIssue } from './ai-types.js'

export const TIMELINE_MAX_ERAS = 50
export const TIMELINE_MAX_EVENTS = 50
export const TIMELINE_MAX_CHARACTERS = 40

const ERA_ALLOWED = new Set(['name', 'startDate', 'endDate', 'precision', 'rollover', 'order'])
const EVENT_ALLOWED = new Set(['title', 'description', 'date', 'endDate', 'eraName', 'characterNames', 'precision', 'order'])
const ERA_PRECISION = new Set(['year', 'month', 'week', 'day', 'hour', 'minute'])
const EVENT_PRECISION = new Set(['year', 'month', 'day', 'minute'])
const ROLLOVER = new Set(['newYear', 'afterYear'])

export interface TimelineEraFill {
  name: string
  startDate?: string
  endDate?: string
  precision?: string
  rollover?: string
  order?: number
}

export interface TimelineEventFill {
  title: string
  description?: string
  date?: string
  endDate?: string
  eraName?: string
  characterNames?: string[]
  precision?: string
  order?: number
}

export interface TimelineFill {
  eras: TimelineEraFill[]
  events: TimelineEventFill[]
}

function invalid(issue: AiValidationIssue = 'shape'): never {
  throw new AiServiceError('AI_INVALID_RESPONSE', 502, issue)
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid('expected_object')
  return value as Record<string, unknown>
}

function text(value: unknown, max: number): string {
  if (typeof value !== 'string') return invalid('expected_string')
  if (!value.trim()) return invalid('empty_string')
  if (value.length > max) return invalid('text_too_long')
  return value.trim()
}

function optionalEnum(value: unknown, allowed: Set<string>): string | undefined {
  const normalized = text(value, 20)
  return allowed.has(normalized) ? normalized : undefined
}

function optionalOrder(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 9999) return invalid('shape')
  return value
}

function characterNames(value: unknown): string[] {
  if (!Array.isArray(value)) return invalid('expected_array')
  if (value.length > TIMELINE_MAX_CHARACTERS) return invalid('array_too_long')
  return value.map((item) => text(item, 80))
}

function parseEra(value: unknown): TimelineEraFill {
  const row = record(value)
  if (Object.keys(row).some((key) => !ERA_ALLOWED.has(key))) return invalid('unexpected_fields')
  const fill: TimelineEraFill = { name: text(row.name, 80) }
  if (row.startDate !== undefined) fill.startDate = text(row.startDate, 80)
  if (row.endDate !== undefined) fill.endDate = text(row.endDate, 80)
  if (row.precision !== undefined) {
    const precision = optionalEnum(row.precision, ERA_PRECISION)
    if (precision) fill.precision = precision
  }
  if (row.rollover !== undefined) {
    const rollover = optionalEnum(row.rollover, ROLLOVER)
    if (rollover) fill.rollover = rollover
  }
  if (row.order !== undefined) fill.order = optionalOrder(row.order)
  return fill
}

function parseEvent(value: unknown): TimelineEventFill {
  const row = record(value)
  if (Object.keys(row).some((key) => !EVENT_ALLOWED.has(key))) return invalid('unexpected_fields')
  const fill: TimelineEventFill = { title: text(row.title, 80) }
  if (row.description !== undefined) fill.description = text(row.description, 1600)
  if (row.date !== undefined) fill.date = text(row.date, 80)
  if (row.endDate !== undefined) fill.endDate = text(row.endDate, 80)
  if (row.eraName !== undefined) fill.eraName = text(row.eraName, 80)
  if (row.characterNames !== undefined) fill.characterNames = characterNames(row.characterNames)
  if (row.precision !== undefined) {
    const precision = optionalEnum(row.precision, EVENT_PRECISION)
    if (precision) fill.precision = precision
  }
  if (row.order !== undefined) fill.order = optionalOrder(row.order)
  return fill
}

export function parseTimelineFill(content: string): TimelineFill {
  let value: unknown
  try { value = JSON.parse(content) } catch { return invalid('invalid_json') }
  const output = record(value)
  if (!('eras' in output) || !('events' in output)) return invalid('shape')
  if (!Array.isArray(output.eras) || !Array.isArray(output.events)) return invalid('expected_array')
  if (output.eras.length > TIMELINE_MAX_ERAS || output.events.length > TIMELINE_MAX_EVENTS) return invalid('array_too_long')
  return {
    eras: output.eras.map(parseEra),
    events: output.events.map(parseEvent),
  }
}

export function eraHasEvidence(fill: TimelineEraFill): boolean {
  return Boolean(fill.name.trim() || fill.startDate || fill.endDate || fill.precision || fill.rollover || fill.order !== undefined)
}

export function eventHasEvidence(fill: TimelineEventFill): boolean {
  return Boolean(
    fill.title.trim()
    || fill.description
    || fill.date
    || fill.endDate
    || fill.eraName
    || fill.characterNames?.length
    || fill.precision
    || fill.order !== undefined,
  )
}
