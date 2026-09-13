import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StructureSuggestions } from '../StructureSuggestions'
import { useAiCapabilities } from '../useAiCapabilities'
import { aiApi } from '@/services/ai'
import { settingsApi } from '@/services/settings'
import { useAiStore } from '@/stores/ai-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useStructureStore } from '@/stores/structure-store'
import { analysis, capabilities } from './fixtures'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }) }))
vi.mock('@/i18n', () => ({ default: { t: (key: string) => key } }))
vi.mock('../useAiCapabilities', () => ({ useAiCapabilities: vi.fn() }))
vi.mock('@/services/ai', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/ai')>()
  return { ...original, aiApi: { analyze: vi.fn(), capabilities: vi.fn() } }
})
vi.mock('@/services/settings', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/settings')>()
  return { ...original, settingsApi: { get: vi.fn(), update: vi.fn() } }
})

const defaultSettings = {
  id: 'settings-1',
  userId: 'user-1',
  theme: 'system',
  language: 'es',
  autoVersion: {
    inactivity: { enabled: true, intervalMs: 300000 },
    exit: { enabled: true },
    hourly: { enabled: true, intervalMs: 3600000 },
    daily: { enabled: true, intervalMs: 86400000 },
    weekly: { enabled: true, intervalMs: 604800000 },
    monthly: { enabled: true, intervalMs: 2592000000 },
  },
  uiPrefs: {},
}

const board = {
  id: 'board-1',
  projectId: 'project-1',
  name: 'Estructura',
  order: 0,
  createdAt: '',
  updatedAt: '',
  columns: [
    { id: 'col-1', boardId: 'board-1', name: 'Inicio', color: null, order: 0, createdAt: '', updatedAt: '', cards: [] },
    { id: 'col-2', boardId: 'board-1', name: 'Desarrollo', color: null, order: 1, createdAt: '', updatedAt: '', cards: [] },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  useAiStore.getState().reset()
  useStructureStore.setState({ boards: [board], activeBoardId: 'board-1' })
  useAiStore.setState({ projectId: 'project-1', capabilities })
  useSettingsStore.setState({ settings: defaultSettings, loading: false, error: null })
  vi.mocked(useAiCapabilities).mockReturnValue({ capabilities, loading: false, error: null, retry: vi.fn() })
  vi.mocked(settingsApi.get).mockResolvedValue(defaultSettings)
  vi.mocked(settingsApi.update).mockResolvedValue(defaultSettings)
  vi.mocked(aiApi.analyze).mockResolvedValue({ ...analysis, suggestions: [] })
})

describe('StructureSuggestions', () => {
  it('shows the warning modal by default when the toolbar button is clicked', async () => {
    render(<StructureSuggestions projectId="project-1" board={board} />)
    fireEvent.click(screen.getByRole('button', { name: 'structureApp.aiSuggestions' }))
    expect(await screen.findByText('structureApp.aiWarningTitle')).toBeVisible()
    expect(aiApi.analyze).not.toHaveBeenCalled()
  })

  it('skips the warning modal after the user opted out', async () => {
    useSettingsStore.setState({
      settings: { ...defaultSettings, uiPrefs: { dismissAiStructureWarning: true } },
    })
    render(<StructureSuggestions projectId="project-1" board={board} />)
    fireEvent.click(screen.getByRole('button', { name: 'structureApp.aiSuggestions' }))
    await waitFor(() => expect(aiApi.analyze).toHaveBeenCalledWith('project-1', 'structure-suggestions', { locale: 'es' }, expect.any(AbortSignal)))
    expect(screen.queryByText('structureApp.aiWarningTitle')).not.toBeInTheDocument()
    expect(await screen.findByRole('dialog', { name: 'structureApp.aiSuggestions' })).toBeVisible()
  })

  it('runs suggestions after acknowledging the warning modal', async () => {
    render(<StructureSuggestions projectId="project-1" board={board} />)
    fireEvent.click(screen.getByRole('button', { name: 'structureApp.aiSuggestions' }))
    fireEvent.click(await screen.findByRole('button', { name: 'structureApp.continueWithAi' }))
    await waitFor(() => expect(aiApi.analyze).toHaveBeenCalledWith('project-1', 'structure-suggestions', { locale: 'es' }, expect.any(AbortSignal)))
    expect(await screen.findByRole('dialog', { name: 'structureApp.aiSuggestions' })).toBeVisible()
  })

  it('persists opt-out when the checkbox is checked before continuing', async () => {
    vi.mocked(settingsApi.update).mockResolvedValue({
      ...defaultSettings,
      uiPrefs: { dismissAiStructureWarning: true },
    })
    render(<StructureSuggestions projectId="project-1" board={board} />)
    fireEvent.click(screen.getByRole('button', { name: 'structureApp.aiSuggestions' }))
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(await screen.findByRole('button', { name: 'structureApp.continueWithAi' }))
    await waitFor(() => expect(settingsApi.update).toHaveBeenCalledWith({ uiPrefs: { dismissAiStructureWarning: true } }))
  })

  it('does not expose the tool to a review-only role', () => {
    const reviewOnly = { ...capabilities, permissions: { chat: false, characters: false, suggestions: true } }
    vi.mocked(useAiCapabilities).mockReturnValue({ capabilities: reviewOnly, loading: false, error: null, retry: vi.fn() })
    const { container } = render(<StructureSuggestions projectId="project-1" board={board} />)
    expect(container).toBeEmptyDOMElement()
    expect(aiApi.analyze).not.toHaveBeenCalled()
  })
})
