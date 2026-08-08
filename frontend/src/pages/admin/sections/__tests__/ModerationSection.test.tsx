import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { ModerationSection } from '../ModerationSection'

const { adminApiMock, toastMock } = vi.hoisted(() => ({
  adminApiMock: { listFandomTree: vi.fn(), listGroups: vi.fn(), moveOption: vi.fn(), deleteOption: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/admin', () => ({ adminApi: adminApiMock }))
vi.mock('@/stores/toast-store', () => ({ useToastStore: () => toastMock }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const baseOpt = {
  type: '',
  value: '',
  label: '',
  isDefault: false,
  createdAt: '',
}

const tree = {
  fandoms: [
    { id: 'f1', value: 'Harry Potter', label: 'Harry Potter', isDefault: false, counts: { ship: 1, character: 0 } },
    { id: 'f2', value: 'harry potter', label: 'harry potter', isDefault: false, counts: { ship: 0, character: 0 } },
    { id: 'f3', value: 'Star Wars', label: 'Star Wars', isDefault: false, counts: { ship: 0, character: 1 } },
  ],
  children: {
    'Harry Potter': {
      ship: [{ ...baseOpt, id: 's1', type: 'ship', value: 'Dramione', label: 'Dramione' }],
      character: [],
    },
    'harry potter': { ship: [], character: [] },
    'Star Wars': {
      ship: [],
      character: [{ ...baseOpt, id: 'c1', type: 'character', value: 'Hermione', label: 'Hermione' }],
    },
  },
}

const tagGroups = [
  [{ ...baseOpt, id: 't1', type: 'tag', value: 'Angst', label: 'Angst' }],
  [
    { ...baseOpt, id: 't2', type: 'tag', value: 'slow burn', label: 'slow burn' },
    { ...baseOpt, id: 't3', type: 'tag', value: 'Slowburn', label: 'Slowburn' },
  ],
]

function makeDataTransfer() {
  let data = ''
  return {
    setData: (mime: string, value: string) => {
      if (mime === 'text/plain') data = value
    },
    getData: () => data,
    effectAllowed: 'move',
  } as unknown as DataTransfer
}

describe('ModerationSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminApiMock.listFandomTree.mockResolvedValue(tree)
    adminApiMock.listGroups.mockResolvedValue({ groups: tagGroups })
  })

  afterEach(() => cleanup())

  it('renderiza la barra de fandoms y selecciona el primero', async () => {
    render(<ModerationSection />)

    await waitFor(() => {
      expect(screen.getAllByText('Harry Potter').length).toBeGreaterThan(0)
    })
    expect(screen.getByText('harry potter')).toBeInTheDocument()
    expect(screen.getByText('Star Wars')).toBeInTheDocument()
    expect(adminApiMock.listFandomTree).toHaveBeenCalled()
    expect(screen.getByText('Dramione')).toBeInTheDocument()
  })

  it('cambia de fandom al hacer clic en la barra lateral', async () => {
    render(<ModerationSection />)

    await waitFor(() => expect(screen.getByText('Star Wars')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Star Wars'))

    await waitFor(() => {
      expect(screen.getByText('Hermione')).toBeInTheDocument()
    })
    expect(screen.queryByText('Dramione')).not.toBeInTheDocument()
  })

  it('mueve una opción al soltarla sobre otro fandom', async () => {
    adminApiMock.moveOption.mockResolvedValue({ ok: true })
    adminApiMock.listFandomTree
      .mockResolvedValueOnce(tree)
      .mockResolvedValueOnce({
        ...tree,
        fandoms: tree.fandoms.map((f) =>
          f.value === 'harry potter'
            ? { ...f, counts: { ship: 1, character: 0 } }
            : f.value === 'Harry Potter'
              ? { ...f, counts: { ship: 0, character: 0 } }
              : f,
        ),
      })

    render(<ModerationSection />)

    await waitFor(() => expect(screen.getByText('Dramione')).toBeInTheDocument())

    const chip = screen.getByText('Dramione').closest('[draggable="true"]')
    expect(chip).toBeTruthy()
    const dt = makeDataTransfer()
    fireEvent.dragStart(chip!, { dataTransfer: dt })
    fireEvent.drop(screen.getByText('harry potter'), { dataTransfer: dt })

    await waitFor(() => {
      expect(adminApiMock.moveOption).toHaveBeenCalledWith('s1', 'harry potter')
    })
    expect(toastMock.success).toHaveBeenCalled()
  })

  it('no mueve al soltar sobre el mismo fandom', async () => {
    render(<ModerationSection />)

    await waitFor(() => expect(screen.getByText('Dramione')).toBeInTheDocument())

    const chip = screen.getByText('Dramione').closest('[draggable="true"]')
    const dt = makeDataTransfer()
    fireEvent.dragStart(chip!, { dataTransfer: dt })
    fireEvent.drop(screen.getAllByText('Harry Potter')[0], { dataTransfer: dt })

    expect(adminApiMock.moveOption).not.toHaveBeenCalled()
  })

  it('elimina una opción suelta', async () => {
    adminApiMock.deleteOption.mockResolvedValue({ ok: true })

    render(<ModerationSection />)

    await waitFor(() => expect(screen.getByText('Dramione')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'admin.delete Dramione' }))

    await waitFor(() => {
      expect(adminApiMock.deleteOption).toHaveBeenCalledWith('s1')
    })
  })

  it('muestra error al intentar eliminar un fandom con hijos', async () => {
    adminApiMock.deleteOption.mockRejectedValue(new Error('admin.hasChildrenError'))

    render(<ModerationSection />)

    await waitFor(() => expect(screen.getAllByText('Harry Potter').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: 'admin.deleteFandom Harry Potter' }))
    await waitFor(() => expect(screen.getByText('admin.deleteFandomConfirm', { exact: false })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /^common\.delete$/ }))

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalled()
    })
  })

  it('muestra las etiquetas globales agrupadas por similitud', async () => {
    render(<ModerationSection />)

    await waitFor(() => expect(screen.getByText('Angst')).toBeInTheDocument())
    expect(screen.getByText('slow burn')).toBeInTheDocument()
    expect(screen.getByText('Slowburn')).toBeInTheDocument()
    expect(adminApiMock.listGroups).toHaveBeenCalledWith('tag')
  })

  it('elimina las demás etiquetas de un grupo conservando la canónica', async () => {
    adminApiMock.deleteOption.mockResolvedValue({ ok: true })
    adminApiMock.listFandomTree
      .mockResolvedValueOnce(tree)
      .mockResolvedValueOnce(tree)
    adminApiMock.listGroups
      .mockResolvedValueOnce({ groups: tagGroups })
      .mockResolvedValueOnce({ groups: [tagGroups[0]] })

    render(<ModerationSection />)

    await waitFor(() => expect(screen.getByText('Slowburn')).toBeInTheDocument())
    fireEvent.click(screen.getAllByText('admin.deleteOthers')[0])

    await waitFor(() => {
      expect(adminApiMock.deleteOption).toHaveBeenCalledWith('t3')
    })
    expect(toastMock.success).toHaveBeenCalled()
  })

  it('filtra los fandoms por texto mientras se escribe', async () => {
    render(<ModerationSection />)

    await waitFor(() => expect(screen.getAllByText('Harry Potter').length).toBeGreaterThan(0))
    fireEvent.change(screen.getByRole('textbox', { name: 'admin.fandomSearchPlaceholder' }), {
      target: { value: 'star' },
    })

    await waitFor(() => {
      expect(screen.getAllByText('Star Wars').length).toBeGreaterThan(0)
    })
    expect(screen.queryByText('harry potter')).not.toBeInTheDocument()
  })

  it('muestra "Sin resultados" cuando no hay fandom que coincida', async () => {
    render(<ModerationSection />)

    await waitFor(() => expect(screen.getAllByText('Harry Potter').length).toBeGreaterThan(0))
    fireEvent.change(screen.getByRole('textbox', { name: 'admin.fandomSearchPlaceholder' }), {
      target: { value: 'zzz' },
    })

    await waitFor(() => {
      expect(screen.getByText('admin.noResults')).toBeInTheDocument()
    })
  })

  it('auto-selecciona el primer resultado al filtrar', async () => {
    render(<ModerationSection />)

    await waitFor(() => expect(screen.getByText('Dramione')).toBeInTheDocument())
    fireEvent.change(screen.getByRole('textbox', { name: 'admin.fandomSearchPlaceholder' }), {
      target: { value: 'star' },
    })

    await waitFor(() => {
      expect(screen.getByText('Hermione')).toBeInTheDocument()
    })
    expect(screen.queryByText('Dramione')).not.toBeInTheDocument()
  })
})
