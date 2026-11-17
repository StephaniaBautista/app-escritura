export type StatsPeriod = 'all' | '7' | '30' | '60' | '90' | 'custom'

export interface StatsQuery {
  period: StatsPeriod
  from: string
  to: string
  timeZone: string
  projectId?: string
  documentId?: string
  subpageId?: string
}

export interface StatsRequestQuery {
  timeZone: string
  from?: string
  to?: string
  days?: 7 | 30 | 60 | 90 | 365
  allTime?: boolean
  projectId?: string
  documentId?: string
}

export interface StatsDay {
  date: string
  wordsAdded: number
  activeSeconds: number
}

export interface StatsDocument {
  id: string
  title: string
  projectId: string
  parentId?: string | null
}

export interface WritingStats {
  timeZone: string
  today: string
  trackedSince: string | null
  range: { from: string; to: string }
  summary: {
    totalWords: number
    wordsAdded: number
    activeSeconds: number
    activeDays: number
    currentStreak: number
    longestStreak: number
    dailyAverage: number
    todayWords: number
  }
  days: StatsDay[]
  calendar: { from: string; to: string; days: StatsDay[] }
  projects: { id: string; name: string }[]
  documents: StatsDocument[]
}

export interface WritingActivity {
  documentId: string
  sessionId: string
  activeMilliseconds: number
  timeZone: string
}
