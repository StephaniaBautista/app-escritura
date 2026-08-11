import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RelationshipDialog } from '../RelationshipDialog'
import type { Character } from '@/types/character'

const mocks = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  create: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/stores/toast-store', () => ({
  useToastStore: () => ({ error: mocks.toastError, success: mocks.toastSuccess }),
}))

vi.mock('@/stores/relationships-store', () => ({
  useRelationshipsStore: () => ({
    relations: [],
    create: mocks.create,
  }),
}))

const lyra: Character = {
  id: 'char-1',
  projectId: 'project-1',
  name: 'Lyra',
  description: null,
  imageUrl: null,
  sheetBackgroundMode: 'default',
  sheetBackgroundImages: [],
  nicknames: [],
  age: null,
  gender: null,
  heightCm: null,
  orientation: null,
  maritalStatus: null,
  species: null,
  birthPlace: null,
  birthDate: null,
  role: null,
  roleSpec: null,
  isOC: false,
  parentIds: [],
  evolvesFromId: null,
  evolutionReason: null,
  storyPoint: null,
  attributes: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const will: Character = { ...lyra, id: 'char-2', name: 'Will' }

describe('RelationshipDialog', () => {
  const renderDialog = (props: Partial<React.ComponentProps<typeof RelationshipDialog>> = {}) => {
    const onClose = vi.fn()
    const onCreated = vi.fn()
    render(
      <RelationshipDialog
        character={lyra}
        allCharacters={[lyra, will]}
        onClose={onClose}
        onCreated={onCreated}
        {...props}
      />,
    )
    return { onClose, onCreated }
  }

  it('no incluye al propio personaje entre las opciones', () => {
    renderDialog()

    const select = screen.getByLabelText('characterApp.relPerson') as HTMLSelectElement
    const values = Array.from(select.querySelectorAll('option')).map((o) => o.getAttribute('value'))
    expect(values).toContain('char-2')
    expect(values).not.toContain('char-1')
  })

  it('no guarda sin personaje elegido', async () => {
    const { onCreated } = renderDialog()

    fireEvent.click(screen.getByText('characterApp.relSave'))

    expect(mocks.toastError).toHaveBeenCalledWith('characterApp.relPersonRequired')
    expect(mocks.create).not.toHaveBeenCalled()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('pide etiqueta en relaciones de familia', async () => {
    renderDialog()

    fireEvent.change(screen.getByLabelText('characterApp.relType'), { target: { value: 'family' } })
    fireEvent.change(screen.getByLabelText('characterApp.relPerson'), { target: { value: 'char-2' } })
    fireEvent.click(screen.getByText('characterApp.relSave'))

    expect(mocks.toastError).toHaveBeenCalledWith('characterApp.relLabelRequired')
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('crea una relación de pareja sin etiqueta', async () => {
    mocks.create.mockResolvedValue({ id: 'rel-1' })
    const { onClose, onCreated } = renderDialog()

    fireEvent.change(screen.getByLabelText('characterApp.relType'), { target: { value: 'romance' } })
    fireEvent.change(screen.getByLabelText('characterApp.relPerson'), { target: { value: 'char-2' } })
    fireEvent.click(screen.getByText('characterApp.relSave'))

    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledWith('project-1', {
        characterAId: 'char-1',
        characterBId: 'char-2',
        type: 'romance',
        label: null,
        description: null,
      })
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('characterApp.relAdded')
    expect(onCreated).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('crea una relación de familia con su etiqueta', async () => {
    mocks.create.mockResolvedValue({ id: 'rel-2' })
    renderDialog()

    fireEvent.change(screen.getByLabelText('characterApp.relType'), { target: { value: 'family' } })
    fireEvent.change(screen.getByLabelText('characterApp.relPerson'), { target: { value: 'char-2' } })
    fireEvent.change(screen.getByLabelText('characterApp.relLabel'), { target: { value: 'Hermano' } })
    fireEvent.click(screen.getByText('characterApp.relSave'))

    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledWith('project-1', expect.objectContaining({
        type: 'family',
        label: 'Hermano',
      }))
    })
  })
})
