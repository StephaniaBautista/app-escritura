import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStatsStore } from '../stats-store'
import { useAuthStore } from '../auth-store'
import { statsApi } from '@/services/stats'
import { writingStats } from '@/components/stats/__tests__/fixtures'
import type { WritingStats } from '@/types/stats'

vi.mock('@/services/stats', async (importOriginal) => ({ ...await importOriginal<typeof import('@/services/stats')>(), statsApi: { get: vi.fn() } }))
beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: { id: 'user-1', email: 'writer@example.test' } })
  useStatsStore.getState().reset()
})

describe('statistics response isolation', () => {
  it('discards a slower response for an earlier filter', async () => {
    let finish!: (value: WritingStats) => void
    vi.mocked(statsApi.get).mockReturnValueOnce(new Promise((resolve) => { finish = resolve })).mockResolvedValueOnce({ ...writingStats, summary: { ...writingStats.summary, totalWords: 8 } })
    const first = useStatsStore.getState().load({ days: 365, timeZone: 'UTC' })
    await useStatsStore.getState().load({ days: 30, timeZone: 'UTC', projectId: 'project-2' })
    finish(writingStats)
    await first
    expect(useStatsStore.getState().report?.summary.totalWords).toBe(8)
    expect(vi.mocked(statsApi.get).mock.calls[0][1]?.aborted).toBe(true)
  })
  it('clears data and rejects late results when the user changes', async () => {
    let finish!: (value: WritingStats) => void
    useStatsStore.setState({ report: writingStats })
    vi.mocked(statsApi.get).mockReturnValueOnce(new Promise((resolve) => { finish = resolve }))
    const loading = useStatsStore.getState().load({ days: 365, timeZone: 'UTC' })
    useAuthStore.setState({ user: { id: 'user-2', email: 'other@example.test' } })
    expect(useStatsStore.getState().report).toBeNull()
    finish(writingStats)
    await loading
    expect(useStatsStore.getState().report).toBeNull()
  })
  it('supports retry after a request fails without retaining an error on success', async () => {
    vi.mocked(statsApi.get).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(writingStats)
    const query = { days: 30 as const, timeZone: 'UTC' }
    await useStatsStore.getState().load(query)
    expect(useStatsStore.getState().error).toBe('statsApp.loadError')
    await useStatsStore.getState().load(query)
    expect(useStatsStore.getState().report).toEqual(writingStats)
    expect(useStatsStore.getState().error).toBeNull()
  })
})
