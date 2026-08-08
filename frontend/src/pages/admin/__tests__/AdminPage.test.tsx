import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { AdminPage } from '../AdminPage'

const { adminApiMock, toastMock, useAuthStoreMock } = vi.hoisted(() => ({
  adminApiMock: { listFandomTree: vi.fn(), listGroups: vi.fn(), moveOption: vi.fn(), deleteOption: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn() },
  useAuthStoreMock: vi.fn(),
}))

vi.mock('@/services/admin', () => ({ adminApi: adminApiMock }))
vi.mock('@/stores/toast-store', () => ({ useToastStore: () => toastMock }))
vi.mock('@/stores/auth-store', () => ({ useAuthStore: useAuthStoreMock }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStoreMock.mockReturnValue({ permissions: ['admin'] })
    adminApiMock.listFandomTree.mockResolvedValue({ fandoms: [], children: {} })
    adminApiMock.listGroups.mockResolvedValue({ groups: [] })
  })

  afterEach(() => cleanup())

  it('muestra las pestañas del panel para un admin', async () => {
    render(<AdminPage />)

    expect(screen.getByRole('button', { name: /admin.tabs.moderate/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /admin.tabs.roles/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /admin.tabs.users/ })).toBeInTheDocument()
  })

  it('un usuario con solo moderación no ve las pestañas de roles ni cuentas', () => {
    useAuthStoreMock.mockReturnValue({ permissions: ['moderate'] })

    render(<AdminPage />)

    expect(screen.getByRole('button', { name: /admin.tabs.moderate/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /admin.tabs.roles/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /admin.tabs.users/ })).not.toBeInTheDocument()
  })

  it('carga el árbol de fandoms de moderación por defecto', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      expect(adminApiMock.listFandomTree).toHaveBeenCalled()
    })
  })
})
