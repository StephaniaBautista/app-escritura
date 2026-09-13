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
  it('distinguishes current content from period growth and resets document selection when changing story', async () => {
    const { container } = render(<StatsDashboard />)
    await waitFor(() => expect(container.querySelector('[data-metric="currentWords"]')).toHaveTextContent('510'))
    expect(container.querySelector('[data-metric="wordsAdded"]')).toHaveTextContent('10')
    fireEvent.change(screen.getByRole('combobox', { name: 'statsApp.document' }), { target: { value: 'document-1' } })
    await waitFor(() => expect(vi.mocked(statsApi.get).mock.lastCall?.[0].documentId).toBe('document-1'))
    fireEvent.change(screen.getByRole('combobox', { name: 'statsApp.project' }), { target: { value: 'project-2' } })
    await waitFor(() => expect(vi.mocked(statsApi.get).mock.lastCall?.[0]).toMatchObject({ projectId: 'project-2' }))
    expect(vi.mocked(statsApi.get).mock.lastCall?.[0].documentId).toBeUndefined()
    expect(screen.getByRole('combobox', { name: 'statsApp.document' })).toHaveValue('')
    expect(screen.queryByRole('option', { name: 'Llegada' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: 'statsApp.period' }), { target: { value: '30' } })
    await waitFor(() => expect(vi.mocked(statsApi.get).mock.lastCall?.[0].days).toBe(30))
  })
  it('shows a truthful empty state while retaining existing word totals and zero calendar cells', async () => {
    vi.mocked(statsApi.get).mockResolvedValue({ ...writingStats, trackedSince: null, summary: { ...writingStats.summary, wordsAdded: 0, activeSeconds: 0 }, days: writingStats.days.map((day) => ({ ...day, wordsAdded: 0, activeSeconds: 0 })) })
    const { container } = render(<StatsDashboard />)
    await screen.findByText('statsApp.emptyTitle')
    expect(screen.getByText('statsApp.notTrackedYet')).toBeVisible()
    expect(container.querySelector('[data-metric="currentWords"]')).toHaveTextContent('510')
    expect(container.querySelectorAll('.stats-day.stats-level-0')).toHaveLength(2)
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
