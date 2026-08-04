import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StructureDialog } from '../StructureDialog'

const { useDocumentStoreMock } = vi.hoisted(() => ({ useDocumentStoreMock: vi.fn() }))

vi.mock('@/stores/document-store', () => ({
  useDocumentStore: useDocumentStoreMock,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const baseStore = {
  updateStoryMeta: vi.fn().mockResolvedValue(undefined),
}

describe('StructureDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDocumentStoreMock.mockReturnValue(baseStore)
  })

  it('no renderiza nada si está cerrado', () => {
    render(<StructureDialog projectId="folder-1" isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByText('storySetup.structureTabTitle')).not.toBeInTheDocument()
  })

  it('muestra solo el formulario de estructura (sin otros pasos)', () => {
    render(<StructureDialog projectId="folder-1" isOpen onClose={vi.fn()} />)

    expect(screen.getByText('storySetup.structureTabTitle')).toBeInTheDocument()
    expect(screen.getByText('storySetup.structureInicio')).toBeInTheDocument()
    expect(screen.getByText('storySetup.structureDesarrollo')).toBeInTheDocument()
    expect(screen.queryByText('storySetup.stepDescription')).not.toBeInTheDocument()
    expect(screen.queryByText('storySetup.stepBasics')).not.toBeInTheDocument()
    expect(screen.queryByText('storySetup.stepPeople')).not.toBeInTheDocument()
  })

  it('guarda la estructura y cierra', async () => {
    const onClose = vi.fn()
    render(<StructureDialog projectId="folder-1" isOpen onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('storySetup.structureInicio'), {
      target: { value: 'Empieza en el bosque' },
    })
    fireEvent.click(screen.getByText('storySetup.saveStructure'))

    await waitFor(() => {
      expect(baseStore.updateStoryMeta).toHaveBeenCalledWith('folder-1', {
        structure: { inicio: 'Empieza en el bosque' },
      })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('preserva la metadata existente al guardar', async () => {
    render(
      <StructureDialog
        projectId="folder-1"
        isOpen
        initialMeta={{ rating: 'teen', structure: { inicio: 'Ya había' } } as never}
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('storySetup.structureInicio'), {
      target: { value: 'Nuevo inicio' },
    })
    fireEvent.click(screen.getByText('storySetup.saveStructure'))

    await waitFor(() => {
      expect(baseStore.updateStoryMeta).toHaveBeenCalledWith('folder-1', {
        rating: 'teen',
        structure: { inicio: 'Nuevo inicio' },
      })
    })
  })
})
