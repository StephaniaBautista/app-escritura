export type TimelineTimeSystem = 'relative' | 'era'

export interface TimelineConfig {
  timeSystem: TimelineTimeSystem
  beforeLabel?: string
  afterLabel?: string
}

export class TimelineConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimelineConfigError'
  }
}

const LABEL_MAX = 10

function trimLabel(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, LABEL_MAX)
}

export function normalizeTimelineConfig(raw: unknown): TimelineConfig {
  if (raw === null || raw === undefined) return { timeSystem: 'relative' }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TimelineConfigError('timelineConfig debe ser un objeto')
  }
  const input = raw as Record<string, unknown>
  if (input.timeSystem !== undefined && input.timeSystem !== 'relative' && input.timeSystem !== 'era') {
    throw new TimelineConfigError('timeSystem debe ser "relative" o "era"')
  }
  const timeSystem: TimelineTimeSystem = input.timeSystem === 'era' ? 'era' : 'relative'
  const beforeLabel = trimLabel(input.beforeLabel)
  const afterLabel = trimLabel(input.afterLabel)
  return {
    timeSystem,
    ...(beforeLabel ? { beforeLabel } : {}),
    ...(afterLabel ? { afterLabel } : {}),
  }
}
