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
    expect(screen.queryByText('storySetup.phaseDuration')).not.toBeInTheDocument()
  })

  it('empieza en la fase de duración', () => {
    render(<StructureDialog projectId="folder-1" isOpen onClose={vi.fn()} />)
    expect(screen.getByText('storySetup.durationQuestion')).toBeInTheDocument()
    expect(screen.getByText('storySetup.guidedModeQuestion')).toBeInTheDocument()
  })

  it('sin modo guiado: salta de duración directamente a estructura', () => {
    render(<StructureDialog projectId="folder-1" isOpen onClose={vi.fn()} />)

    fireEvent.click(screen.getByText('storySetup.guidedModeNo'))
    fireEvent.click(screen.getByText('storySetup.next'))

    expect(screen.getByText('storySetup.structureInicio')).toBeInTheDocument()
    expect(screen.queryByText('storySetup.guidedEnding')).not.toBeInTheDocument()
  })

  it('con modo guiado: muestra preguntas guiadas antes de estructura', () => {
    render(<StructureDialog projectId="folder-1" isOpen onClose={vi.fn()} />)

    fireEvent.click(screen.getByText('storySetup.guidedModeYes'))
    fireEvent.click(screen.getByText('storySetup.next'))

    expect(screen.getByText('storySetup.guidedEnding')).toBeInTheDocument()
    expect(screen.getByText('storySetup.guidedMentalState')).toBeInTheDocument()

    fireEvent.click(screen.getByText('storySetup.next'))
    expect(screen.getByText('storySetup.structureInicio')).toBeInTheDocument()
  })

  it('muestra pantalla de completado al final', () => {
    render(<StructureDialog projectId="folder-1" isOpen onClose={vi.fn()} />)

    fireEvent.click(screen.getByText('storySetup.guidedModeNo'))
    fireEvent.click(screen.getByText('storySetup.next'))
    fireEvent.click(screen.getByText('storySetup.next'))

    expect(screen.getByText('storySetup.completeTitle')).toBeInTheDocument()
    expect(screen.getByText('storySetup.startWriting')).toBeInTheDocument()
    expect(screen.getByText('storySetup.continueDeveloping')).toBeInTheDocument()
  })

  it('guarda la metadata al hacer click en "Empezar a escribir"', async () => {
    const onStartWriting = vi.fn()
    render(<StructureDialog projectId="folder-1" isOpen onClose={vi.fn()} onStartWriting={onStartWriting} />)

    fireEvent.click(screen.getByText('storySetup.guidedModeYes'))
    fireEvent.click(screen.getByText('storySetup.next')) // → guided
    fireEvent.click(screen.getByText('storySetup.next')) // → structure
    fireEvent.click(screen.getByText('storySetup.next')) // → complete
    fireEvent.click(screen.getByText('storySetup.startWriting'))

    await waitFor(() => {
      expect(baseStore.updateStoryMeta).toHaveBeenCalledWith('folder-1', expect.objectContaining({ guidedMode: true }))
    })
    expect(onStartWriting).toHaveBeenCalled()
  })

  it('guarda y cierra al hacer click en "Seguir desarrollando"', async () => {
    const onClose = vi.fn()
    render(<StructureDialog projectId="folder-1" isOpen onClose={onClose} />)

    fireEvent.click(screen.getByText('storySetup.guidedModeNo'))
    fireEvent.click(screen.getByText('storySetup.next'))
    fireEvent.click(screen.getByText('storySetup.next'))
    fireEvent.click(screen.getByText('storySetup.continueDeveloping'))

    await waitFor(() => {
      expect(baseStore.updateStoryMeta).toHaveBeenCalled()
    })
    expect(onClose).toHaveBeenCalled()
  })
})
