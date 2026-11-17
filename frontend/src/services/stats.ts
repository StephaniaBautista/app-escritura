import type { StatsRequestQuery, WritingActivity, WritingStats } from '@/types/stats'

export function browserTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { return 'UTC' }
}

export class StatsRequestError extends Error {
  constructor(readonly status: number) {
    super(`Stats request failed: ${status}`)
    this.name = 'StatsRequestError'
  }
}

export const statsApi = {
  async get(query: StatsRequestQuery, signal?: AbortSignal): Promise<WritingStats> {
    const params = new URLSearchParams({ timeZone: query.timeZone })
    if (query.allTime) params.set('allTime', 'true')
    else if (query.from && query.to) {
      params.set('from', query.from)
      params.set('to', query.to)
    } else if (query.days) params.set('days', String(query.days))
    if (query.projectId) params.set('projectId', query.projectId)
    if (query.documentId) params.set('documentId', query.documentId)
    const response = await fetch(`/api/stats?${params}`, { credentials: 'include', signal })
    if (!response.ok) throw new StatsRequestError(response.status)
    return response.json() as Promise<WritingStats>
  },
  async activity(activity: WritingActivity, options: { signal?: AbortSignal; keepalive?: boolean } = {}): Promise<void> {
    const timeout = AbortSignal.timeout(10_000)
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
    const response = await fetch('/api/stats/activity', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity), ...options, signal,
    })
    if (!response.ok) throw new StatsRequestError(response.status)
  },
}
