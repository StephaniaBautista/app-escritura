import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { AdminPage } from '../AdminPage'

const { adminApiMock, toastMock } = vi.hoisted(() => ({
  adminApiMock: { listGroups: vi.fn(), delete: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/admin', () => ({ adminApi: adminApiMock }))
vi.mock('@/stores/toast-store', () => ({ useToastStore: () => toastMock }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const groups = [
  [
    { id: 'g1', type: 'fandom', value: 'Harry Potter', label: 'Harry Potter', isDefault: false, createdAt: '' },
    { id: 'g2', type: 'fandom', value: 'Hary Potter', label: 'Hary Potter', isDefault: false, createdAt: '' },
  ],
  [{ id: 'g3', type: 'fandom', value: 'Star Wars', label: 'Star Wars', isDefault: false, createdAt: '' }],
]

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminApiMock.listGroups.mockResolvedValue({ groups })
  })

  afterEach(() => cleanup())

  it('renderiza los grupos de similitud por tipo', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Harry Potter')).toBeInTheDocument()
    })
    expect(screen.getByText('Hary Potter')).toBeInTheDocument()
    expect(screen.getByText('Star Wars')).toBeInTheDocument()
    expect(adminApiMock.listGroups).toHaveBeenCalledWith('fandom')
  })

  it('elimina los duplicados de un grupo conservando el marcado', async () => {
    adminApiMock.delete.mockResolvedValue({ ok: true })
    adminApiMock.listGroups.mockResolvedValueOnce({ groups }).mockResolvedValueOnce({ groups: [groups[0], groups[1]] })

    render(<AdminPage />)

    await waitFor(() => expect(screen.getByText('Harry Potter')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /^admin\.deleteOthers$/ }))

    await waitFor(() => {
      expect(adminApiMock.delete).toHaveBeenCalledWith('g2')
    })
  })

  it('elimina una opción suelta (grupo de 1)', async () => {
    adminApiMock.delete.mockResolvedValue({ ok: true })
    adminApiMock.listGroups.mockResolvedValueOnce({ groups }).mockResolvedValueOnce({ groups: [groups[0]] })

    render(<AdminPage />)

    await waitFor(() => expect(screen.getByText('Star Wars')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /^admin\.delete$/ }))

    await waitFor(() => {
      expect(adminApiMock.delete).toHaveBeenCalledWith('g3')
    })
  })
})
