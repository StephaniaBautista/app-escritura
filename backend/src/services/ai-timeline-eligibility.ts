export const TIMELINE_ERA_FIELDS = ['name', 'startDate', 'endDate', 'precision', 'rollover'] as const
export const TIMELINE_EVENT_FIELDS = ['title', 'description', 'date', 'endDate', 'eraName', 'characterNames'] as const

export type TimelineEraField = (typeof TIMELINE_ERA_FIELDS)[number]
export type TimelineEventField = (typeof TIMELINE_EVENT_FIELDS)[number]

export interface TimelineEraSnapshot {
  name?: string | null
  startDate?: string | null
  endDate?: string | null
}

export interface TimelineEventSnapshot {
  title?: string | null
  description?: string | null
  date?: string | null
  endDate?: string | null
  eraId?: string | null
  characterIds?: string[]
}

function blank(value: unknown): boolean {
  return typeof value !== 'string' || !value.trim()
}

export function timelineGapCount(eras: TimelineEraSnapshot[], events: TimelineEventSnapshot[]): number {
  let count = 2
  if (eras.length === 0) {
    count += TIMELINE_ERA_FIELDS.length - 1
  } else {
    for (const era of eras) {
      if (blank(era.startDate)) count += 1
      if (blank(era.endDate)) count += 1
    }
  }
  if (events.length === 0) {
    count += TIMELINE_EVENT_FIELDS.length - 1
  } else {
    for (const event of events) {
      if (blank(event.description)) count += 1
      if (blank(event.date)) count += 1
      if (blank(event.endDate)) count += 1
      if (blank(event.eraId)) count += 1
      if (!event.characterIds || event.characterIds.length === 0) count += 1
    }
  }
  return count
}
