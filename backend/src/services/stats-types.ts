export interface StatsQuery {
  days?: 30 | 90 | 365
  timeZone?: string
  projectId?: string
  documentId?: string
}

export interface WritingActivityInput {
  documentId: string
  sessionId: string
  activeMilliseconds: number
  timeZone: string
}

export interface WritingDay {
  date: string
  wordsAdded: number
  activeSeconds: number
}

export class StatsError extends Error {
  constructor(public code: string, public statusCode: number) {
    super(code)
    this.name = 'StatsError'
  }
}
