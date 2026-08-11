export interface TimelineEvent {
  id: string
  projectId: string
  title: string
  date: string | null
  description: string | null
  order: number
  characterIds: string[]
  createdAt: string
  updatedAt: string
}

export interface TimelineEventInput {
  title?: string
  date?: string | null
  description?: string | null
  order?: number
  characterIds?: string[]
}
