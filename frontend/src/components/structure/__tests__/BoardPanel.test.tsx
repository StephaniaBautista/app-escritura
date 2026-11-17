import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BoardPanel } from '../BoardPanel'
import { useAiStore } from '@/stores/ai-store'
import { useStructureStore } from '@/stores/structure-store'
import { capabilities } from '@/components/ai/__tests__/fixtures'
import { structureApi, subplotsApi } from '@/services/structure'
import { aiApi } from '@/services/ai'
import type { StructureBoard } from '@/types/structure'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => values?.count === undefined ? key : `${key} ${values.count}`, i18n: { language: 'es' } }) }))
vi.mock('@/i18n', () => ({ default: { t: (key: string) => key } }))
vi.mock('@/services/structure', async (importOriginal) => ({ ...await importOriginal<typeof import('@/services/structure')>(), structureApi: { listBoards: vi.fn(), syncChapters: vi.fn() }, subplotsApi: { list: vi.fn() } }))
vi.mock('@/services/ai', async (importOriginal) => ({ ...await importOriginal<typeof import('@/services/ai')>(), aiApi: { capabilities: vi.fn(), analyze: vi.fn() } }))
vi.mock('@/components/ai/StructureSuggestions', () => ({ StructureSuggestions: () => null }))

const board: StructureBoard = {
  id: 'board-1',
  projectId: 'project-1',
  name: 'Estructura',
  order: 0,
  createdAt: '',
  updatedAt: '',
  columns: [
    { id: 'col-1', boardId: 'board-1', name: 'Inicio', color: null, order: 0, createdAt: '', updatedAt: '', cards: [] },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  useAiStore.getState().reset()
  useStructureStore.setState({
    boards: [],
    activeBoardId: null,
    projectId: null,
    isLoadingBoards: false,
    subplots: [],
    hiddenSubplotIds: [],
    isLoadingSubplots: false,
  })
  vi.mocked(structureApi.listBoards).mockResolvedValue([board])
  vi.mocked(subplotsApi.list).mockResolvedValue([])
  vi.mocked(aiApi.capabilities).mockResolvedValue(capabilities)
})

describe('BoardPanel', () => {
  it('renders without infinite re-renders when AI capabilities are still null', async () => {
    useAiStore.setState({ capabilities: null, capabilityLoading: false })
    render(<BoardPanel projectId="project-1" />)
    await waitFor(() => expect(screen.getByText('structureApp.boardTitle')).toBeVisible())
    expect(screen.getByRole('button', { name: 'structureApp.addColumn' })).toBeVisible()
  })

  it('shows sync chapters when capabilities expose unlinked chapters', async () => {
    useAiStore.setState({ projectId: 'project-1', capabilities, capabilityLoading: false })
    render(<BoardPanel projectId="project-1" />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'structureApp.syncChapters 1' })).toBeVisible())
  })

  it('renders board actions in a dedicated toolbar row below the subtitle', async () => {
    render(<BoardPanel projectId="project-1" />)
    await waitFor(() => expect(screen.getByTestId('structure-board-toolbar')).toBeVisible())
    expect(screen.getByText('structureApp.boardSubtitle')).toBeVisible()
    expect(screen.getByRole('button', { name: 'structureApp.addColumn' })).toBeVisible()
  })

  it('shows the subplots layer button in the toolbar and loads subplots', async () => {
    render(<BoardPanel projectId="project-1" />)
    await waitFor(() => expect(screen.getByTestId('subplots-layer-button')).toBeVisible())
    expect(subplotsApi.list).toHaveBeenCalledWith('project-1')
  })
})
