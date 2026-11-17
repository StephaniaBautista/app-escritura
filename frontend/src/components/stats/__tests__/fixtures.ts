import type { WritingStats } from '@/types/stats'

export const writingStats: WritingStats = {
  timeZone: 'America/Mexico_City', today: '2026-09-12', trackedSince: '2026-09-12T00:00:00Z',
  range: { from: '2026-09-11', to: '2026-09-12' },
  summary: { totalWords: 510, wordsAdded: 10, activeSeconds: 60, activeDays: 1, currentStreak: 1, longestStreak: 1, dailyAverage: 5, todayWords: 10 },
  days: [{ date: '2026-09-11', wordsAdded: 0, activeSeconds: 0 }, { date: '2026-09-12', wordsAdded: 10, activeSeconds: 60 }],
  calendar: { from: '2026-09-11', to: '2026-09-12', days: [{ date: '2026-09-11', wordsAdded: 0, activeSeconds: 0 }, { date: '2026-09-12', wordsAdded: 10, activeSeconds: 60 }] },
  projects: [{ id: 'project-1', name: 'El faro' }, { id: 'project-2', name: 'La isla' }],
  documents: [
    { id: 'document-1', title: 'Llegada', projectId: 'project-1', parentId: null },
    { id: 'subpage-1', title: 'Muelle', projectId: 'project-1', parentId: 'document-1' },
    { id: 'document-2', title: 'Partida', projectId: 'project-2', parentId: null },
  ],
}
