export type TimelinePrecision = 'year' | 'month' | 'day' | 'minute'
export type TimelineTimeSystem = 'relative' | 'era'
export type EraRollover = 'newYear' | 'afterYear'

export interface TimelineConfig {
  timeSystem: TimelineTimeSystem
  beforeLabel?: string
  afterLabel?: string
}

export const DEFAULT_TIMELINE_CONFIG: TimelineConfig = { timeSystem: 'relative' }

export interface TimelineEra {
  id: string
  projectId: string
  name: string
  color: string | null
  precision: string
  startDate: string | null
  endDate: string | null
  rollover: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface TimelineEraInput {
  name?: string
  color?: string | null
  precision?: string | null
  startDate?: string | null
  endDate?: string | null
  rollover?: string | null
}

export interface TimelineEvent {
  id: string
  projectId: string
  title: string
  date: string | null
  description: string | null
  order: number
  eraId: string | null
  characterIds: string[]
  icon: string | null
  color: string | null
  groupName: string | null
  precision: string
  endDate: string | null
  label: string | null
  labelColor: string | null
  imageUrl: string | null
  relatedEventIds: string[]
  relatedDocumentIds: string[]
  subplotId: string | null
  createdAt: string
  updatedAt: string
}

export interface TimelineEventInput {
  title?: string
  date?: string | null
  description?: string | null
  order?: number
  eraId?: string | null
  characterIds?: string[]
  icon?: string | null
  color?: string | null
  groupName?: string | null
  precision?: TimelinePrecision | null
  endDate?: string | null
  label?: string | null
  labelColor?: string | null
  imageUrl?: null
  relatedEventIds?: string[]
  relatedDocumentIds?: string[]
  subplotId?: string | null
}
