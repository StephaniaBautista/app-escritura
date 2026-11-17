import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StatsDashboard } from '../StatsDashboard'
import { statsApi } from '@/services/stats'
import { useAuthStore } from '@/stores/auth-store'
import { useStatsStore } from '@/stores/stats-store'
import { writingStats } from './fixtures'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => values?.count === undefined ? key : `${key} ${values.count}`, i18n: { language: 'es' } }) }))
vi.mock('@/services/stats', async (importOriginal) => ({ ...await importOriginal<typeof import('@/services/stats')>(), statsApi: { get: vi.fn() } }))
beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: { id: 'user-1', email: 'writer@example.test' } })
  useStatsStore.getState().reset()
  vi.mocked(statsApi.get).mockResolvedValue(writingStats)
})

describe('statistics dashboard', () => {
  it('reveals document then subpage filters only after a concrete folder and document', async () => {
    const { container } = render(<StatsDashboard />)
    await waitFor(() => expect(container.querySelector('[data-metric="currentWords"]')).toHaveTextContent('510'))
    expect(container.querySelector('[data-metric="todayWords"]')).toHaveTextContent('10')
    expect(container.querySelector('[data-metric="activeDays"]')).toBeNull()
    expect(screen.queryByText('statsApp.timeZone')).not.toBeInTheDocument()
    expect(screen.queryByText('statsApp.growthExplanation')).not.toBeInTheDocument()
    expect(screen.queryByText('statsApp.dailyTable')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'statsApp.document' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('statsApp.rangeFrom')).not.toBeInTheDocument()
    expect(vi.mocked(statsApi.get).mock.calls[0][0]).toMatchObject({ days: 30 })
    fireEvent.change(screen.getByRole('combobox', { name: 'statsApp.folder' }), { target: { value: 'project-1' } })
    await waitFor(() => expect(vi.mocked(statsApi.get).mock.lastCall?.[0].projectId).toBe('project-1'))
    fireEvent.change(screen.getByRole('combobox', { name: 'statsApp.document' }), { target: { value: 'document-1' } })
    await waitFor(() => expect(vi.mocked(statsApi.get).mock.lastCall?.[0].documentId).toBe('document-1'))
    fireEvent.change(screen.getByRole('combobox', { name: 'statsApp.subpage' }), { target: { value: 'subpage-1' } })
    await waitFor(() => expect(vi.mocked(statsApi.get).mock.lastCall?.[0].documentId).toBe('subpage-1'))
    fireEvent.change(screen.getByRole('combobox', { name: 'statsApp.folder' }), { target: { value: 'project-2' } })
    await waitFor(() => expect(vi.mocked(statsApi.get).mock.lastCall?.[0]).toMatchObject({ projectId: 'project-2' }))
    expect(vi.mocked(statsApi.get).mock.lastCall?.[0].documentId).toBeUndefined()
    expect(screen.queryByRole('combobox', { name: 'statsApp.subpage' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'statsApp.periodAll' }))
    await waitFor(() => expect(vi.mocked(statsApi.get).mock.lastCall?.[0].allTime).toBe(true))
    fireEvent.click(screen.getByRole('radio', { name: 'statsApp.lastDays 7' }))
    await waitFor(() => expect(vi.mocked(statsApi.get).mock.lastCall?.[0].days).toBe(7))
    fireEvent.click(screen.getByRole('radio', { name: 'statsApp.periodCustom' }))
    fireEvent.change(screen.getByLabelText('statsApp.rangeFrom'), { target: { value: '2026-08-14' } })
    await waitFor(() => expect(vi.mocked(statsApi.get).mock.lastCall?.[0].from).toBe('2026-08-14'))
    expect(screen.getByRole('img', { name: /statsApp.wordsChart/ })).toBeInTheDocument()
  })
  it('shows a truthful empty state while retaining existing word totals and zero calendar cells', async () => {
    vi.mocked(statsApi.get).mockResolvedValue({
      ...writingStats,
      trackedSince: null,
      summary: { ...writingStats.summary, wordsAdded: 0, activeSeconds: 0 },
      days: writingStats.days.map((day) => ({ ...day, wordsAdded: 0, activeSeconds: 0 })),
      calendar: { ...writingStats.calendar, days: writingStats.calendar.days.map((day) => ({ ...day, wordsAdded: 0, activeSeconds: 0 })) },
    })
    const { container } = render(<StatsDashboard />)
    await screen.findByText('statsApp.emptyTitle')
    expect(screen.queryByText('statsApp.notTrackedYet')).not.toBeInTheDocument()
    expect(container.querySelector('[data-metric="currentWords"]')).toHaveTextContent('510')
    expect(container.querySelectorAll('.stats-day.stats-level-0')).toHaveLength(2)
  })
  it('keeps the year heatmap even when the period filter is a few days', async () => {
    vi.mocked(statsApi.get).mockResolvedValue({
      ...writingStats,
      range: { from: '2026-09-06', to: '2026-09-12' },
      days: writingStats.days,
      calendar: {
        from: '2026-09-08',
        to: '2026-09-12',
        days: ['2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12'].map((date) => ({ date, wordsAdded: 0, activeSeconds: 0 })),
      },
    })
    const { container } = render(<StatsDashboard />)
    await waitFor(() => expect(container.querySelectorAll('.stats-day')).toHaveLength(5))
  })
  it('exposes a retry that recovers from a loading error', async () => {
    vi.mocked(statsApi.get).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(writingStats)
    render(<StatsDashboard />)
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'statsApp.retry' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'statsApp.calendar' })).toBeVisible()
  })
})
