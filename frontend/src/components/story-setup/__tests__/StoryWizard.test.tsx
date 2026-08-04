import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StoryWizard } from '../StoryWizard'

const { useDocumentStoreMock, useOptionsStoreMock } = vi.hoisted(() => ({
  useDocumentStoreMock: vi.fn(),
  useOptionsStoreMock: vi.fn(),
}))

vi.mock('@/stores/document-store', () => ({
  useDocumentStore: useDocumentStoreMock,
}))

vi.mock('@/stores/options-store', () => ({
  useOptionsStore: useOptionsStoreMock,
}))

const t = (key: string) => key

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t }),
}))

const baseStore = {
  updateProject: vi.fn().mockResolvedValue(undefined),
  updateStoryMeta: vi.fn().mockResolvedValue(undefined),
}

const ratingOptions = [
  { id: '1', userId: null, type: 'rating', value: 'general', label: 'General', isDefault: true, createdAt: '' },
  { id: '2', userId: null, type: 'rating', value: 'teen', label: 'Teen', isDefault: true, createdAt: '' },
]

const storyTypeOptions = [
  { id: '3', userId: null, type: 'storyType', value: 'Romance', label: 'Romance', isDefault: true, createdAt: '' },
  { id: '4', userId: null, type: 'storyType', value: 'Drama', label: 'Drama', isDefault: true, createdAt: '' },
]

const allOptions = { rating: ratingOptions, storyType: storyTypeOptions }

const optionsStoreState = {
  options: allOptions,
  loading: {},
  loadOptions: vi.fn(),
  addOption: vi.fn(),
  removeOption: vi.fn(),
  getOptions: vi.fn().mockReturnValue(ratingOptions),
}

describe('StoryWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDocumentStoreMock.mockReturnValue(baseStore)
    useOptionsStoreMock.mockImplementation((selector?: (state: typeof optionsStoreState) => unknown) => {
      if (typeof selector === 'function') return selector(optionsStoreState)
      return optionsStoreState
    })
  })

  it('no renderiza nada si está cerrado', () => {
    render(<StoryWizard projectId="folder-1" isOpen={false} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.queryByText('storySetup.title')).not.toBeInTheDocument()
  })

  it('empieza por la descripción y muestra Siguiente', () => {
    render(<StoryWizard projectId="folder-1" isOpen onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText('storySetup.stepDescription')).toBeInTheDocument()
    expect(screen.getByText('storySetup.next')).toBeInTheDocument()
    expect(screen.queryByText('storySetup.finish')).not.toBeInTheDocument()
  })

  it('NO muestra el paso Parejas si el tipo no incluye Romance ni es fanfic', () => {
    render(<StoryWizard projectId="folder-1" isOpen onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.queryByText('storySetup.stepCouples')).not.toBeInTheDocument()
  })

  it('muestra el paso Parejas cuando el tipo incluye Romance', () => {
    render(<StoryWizard projectId="folder-1" isOpen onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByText('storySetup.stepBasics'))
    const typeSelect = screen.getByLabelText('storySetup.type')
    fireEvent.change(typeSelect, { target: { value: 'Romance' } })

    expect(screen.getByText('storySetup.stepCouples')).toBeInTheDocument()
  })

  it('muestra el paso Parejas cuando es fanfic', () => {
    render(<StoryWizard projectId="folder-1" isOpen onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByText('storySetup.stepBasics'))
    fireEvent.change(screen.getByLabelText('storySetup.isFanfic'), { target: { value: 'yes' } })

    expect(screen.getByText('storySetup.stepCouples')).toBeInTheDocument()
  })

  it('permite hacer click en un tab para saltar directamente a ese paso', () => {
    render(<StoryWizard projectId="folder-1" isOpen onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByText('storySetup.stepTags'))
    expect(screen.getByText('storySetup.finish')).toBeInTheDocument()
    expect(screen.queryByText('storySetup.next')).not.toBeInTheDocument()
  })

  it('mantiene la descripción al saltar entre tabs', () => {
    render(<StoryWizard projectId="folder-1" isOpen onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('storySetup.descriptionLabel'), {
      target: { value: 'Mi historia' },
    })
    fireEvent.click(screen.getByText('storySetup.stepBasics'))
    fireEvent.click(screen.getByText('storySetup.stepDescription'))
    expect(screen.getByLabelText('storySetup.descriptionLabel')).toHaveValue('Mi historia')
  })

  it('selecciona rating con select y guarda la metadata al finalizar', async () => {
    render(<StoryWizard projectId="folder-1" isOpen onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('storySetup.descriptionLabel'), {
      target: { value: 'Historia con rating' },
    })

    fireEvent.click(screen.getByText('storySetup.stepBasics'))
    fireEvent.change(screen.getByLabelText('storySetup.rating'), { target: { value: 'teen' } })

    fireEvent.click(screen.getByText('storySetup.stepTags'))
    fireEvent.click(screen.getByText('storySetup.finish'))

    await waitFor(() => {
      expect(baseStore.updateProject).toHaveBeenCalledWith('folder-1', { description: 'Historia con rating' })
      expect(baseStore.updateStoryMeta).toHaveBeenCalledWith('folder-1', { rating: 'teen' })
    })
  })

  it('no sobreescribe storyMeta si no cambió', async () => {
    render(
      <StoryWizard
        projectId="folder-1"
        isOpen
        initialMeta={{ rating: 'mature' } as never}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText('storySetup.stepTags'))
    fireEvent.click(screen.getByText('storySetup.finish'))

    await waitFor(() => {
      expect(baseStore.updateStoryMeta).not.toHaveBeenCalled()
    })
  })

  it('llama onSaved tras guardar', async () => {
    const onSaved = vi.fn()
    render(<StoryWizard projectId="folder-1" isOpen onClose={vi.fn()} onSaved={onSaved} />)

    fireEvent.click(screen.getByText('storySetup.stepTags'))
    fireEvent.click(screen.getByText('storySetup.finish'))

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled()
    })
  })

  it('precarga la descripción inicial', () => {
    render(
      <StoryWizard
        projectId="folder-1"
        isOpen
        initialDescription="Descripción ya guardada"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('storySetup.descriptionLabel')).toHaveValue('Descripción ya guardada')
  })
})
