export type StatsPeriod = 30 | 90 | 365

export interface StatsQuery {
  days: StatsPeriod
  timeZone: string
  projectId?: string
  documentId?: string
}

export interface StatsDay {
  date: string
  wordsAdded: number
  activeSeconds: number
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
  projects: { id: string; name: string }[]
  documents: { id: string; title: string; projectId: string; parentId?: string | null }[]
}

export interface WritingActivity {
  documentId: string
  sessionId: string
  activeMilliseconds: number
  timeZone: string
}
