import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { RolesSection } from '../RolesSection'

const { adminApiMock, toastMock } = vi.hoisted(() => ({
  adminApiMock: { listRoles: vi.fn(), createRole: vi.fn(), updateRole: vi.fn(), deleteRole: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/admin', () => ({ adminApi: adminApiMock, ALL_PERMISSIONS: ['admin', 'moderate'] }))
vi.mock('@/stores/toast-store', () => ({ useToastStore: () => toastMock }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const roles = [
  { id: 'r1', name: 'superadmin', label: 'Superadmin', permissions: ['admin', 'moderate'], isSystem: true, userCount: 1, createdAt: '' },
  { id: 'r2', name: 'moderator', label: 'Moderator', permissions: ['moderate'], isSystem: true, userCount: 2, createdAt: '' },
  { id: 'r3', name: 'beta', label: 'Beta reader', permissions: [], isSystem: false, userCount: 0, createdAt: '' },
]

describe('RolesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminApiMock.listRoles.mockResolvedValue(roles)
  })

  afterEach(() => cleanup())

  it('renderiza los roles cargados', async () => {
    render(<RolesSection />)

    await waitFor(() => {
      expect(screen.getByText(/Superadmin/)).toBeInTheDocument()
    })
    expect(screen.getByText(/Moderator/)).toBeInTheDocument()
    expect(screen.getByText(/Beta reader/)).toBeInTheDocument()
    expect(adminApiMock.listRoles).toHaveBeenCalled()
  })

  it('filtra los roles por etiqueta', async () => {
    render(<RolesSection />)

    await waitFor(() => expect(screen.getByText(/Superadmin/)).toBeInTheDocument())
    fireEvent.change(screen.getByRole('textbox', { name: 'admin.roles.searchPlaceholder' }), {
      target: { value: 'beta' },
    })

    await waitFor(() => {
      expect(screen.getByText(/Beta reader/)).toBeInTheDocument()
    })
    expect(screen.queryByText(/Superadmin/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Moderator/)).not.toBeInTheDocument()
  })

  it('filtra los roles por nombre', async () => {
    render(<RolesSection />)

    await waitFor(() => expect(screen.getByText(/Superadmin/)).toBeInTheDocument())
    fireEvent.change(screen.getByRole('textbox', { name: 'admin.roles.searchPlaceholder' }), {
      target: { value: 'mod' },
    })

    await waitFor(() => {
      expect(screen.getByText(/Moderator/)).toBeInTheDocument()
    })
    expect(screen.queryByText(/Beta reader/)).not.toBeInTheDocument()
  })

  it('muestra "Sin resultados" cuando ningún rol coincide', async () => {
    render(<RolesSection />)

    await waitFor(() => expect(screen.getByText(/Superadmin/)).toBeInTheDocument())
    fireEvent.change(screen.getByRole('textbox', { name: 'admin.roles.searchPlaceholder' }), {
      target: { value: 'zzz' },
    })

    await waitFor(() => {
      expect(screen.getByText('admin.noResults')).toBeInTheDocument()
    })
  })
})
