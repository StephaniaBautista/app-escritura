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
  name: string
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
}
