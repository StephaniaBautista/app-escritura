import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { UsersSection } from '../UsersSection'

const { adminApiMock, toastMock, useAuthStoreMock } = vi.hoisted(() => ({
  adminApiMock: { listUsers: vi.fn(), listRoles: vi.fn(), assignRole: vi.fn(), setUserStatus: vi.fn(), deleteUser: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn() },
  useAuthStoreMock: vi.fn(),
}))

vi.mock('@/services/admin', () => ({ adminApi: adminApiMock }))
vi.mock('@/stores/toast-store', () => ({ useToastStore: () => toastMock }))
vi.mock('@/stores/auth-store', () => ({ useAuthStore: useAuthStoreMock }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const users = [
  { id: 'u1', email: 'ana@test.com', name: 'Ana', role: 'user', status: 'active', suspendedUntil: null, createdAt: '' },
  { id: 'u2', email: 'juan@test.com', name: null, role: 'moderator', status: 'suspended', suspendedUntil: '2026-09-01T00:00:00.000Z', createdAt: '' },
  { id: 'u3', email: 'lucia@test.com', name: 'Lucia', role: 'superadmin', status: 'active', suspendedUntil: null, createdAt: '' },
  { id: 'u4', email: 'pedro@test.com', name: 'Pedro', role: 'user', status: 'banned', suspendedUntil: null, createdAt: '' },
]

const roles = [
  { id: 'r1', name: 'user', label: 'Usuario', permissions: [], isSystem: true, userCount: 2, createdAt: '' },
  { id: 'r2', name: 'moderator', label: 'Moderador', permissions: ['moderate'], isSystem: true, userCount: 1, createdAt: '' },
  { id: 'r3', name: 'superadmin', label: 'Superadmin', permissions: ['admin', 'moderate'], isSystem: true, userCount: 1, createdAt: '' },
]

describe('UsersSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStoreMock.mockReturnValue({ user: { id: 'u3' } })
    adminApiMock.listUsers.mockResolvedValue(users)
    adminApiMock.listRoles.mockResolvedValue(roles)
    adminApiMock.setUserStatus.mockResolvedValue({ ok: true })
    adminApiMock.deleteUser.mockResolvedValue({ ok: true })
  })

  afterEach(() => cleanup())

  it('renderiza las cuentas con su estado', async () => {
    render(<UsersSection />)

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
    })
    expect(screen.getByText('juan@test.com')).toBeInTheDocument()
    expect(screen.getByText('Lucia')).toBeInTheDocument()
    expect(screen.getAllByText('admin.users.status.active').length).toBeGreaterThan(0)
    expect(screen.getByText('admin.users.status.suspended')).toBeInTheDocument()
    expect(screen.getByText('admin.users.status.banned')).toBeInTheDocument()
    expect(screen.getByText('admin.users.protected')).toBeInTheDocument()
  })

  it('filtra las cuentas por nombre', async () => {
    render(<UsersSection />)

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument())
    fireEvent.change(screen.getByRole('textbox', { name: 'admin.users.searchPlaceholder' }), {
      target: { value: 'ana' },
    })

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
    })
    expect(screen.queryByText('juan@test.com')).not.toBeInTheDocument()
    expect(screen.queryByText('Lucia')).not.toBeInTheDocument()
  })

  it('filtra las cuentas por email', async () => {
    render(<UsersSection />)

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument())
    fireEvent.change(screen.getByRole('textbox', { name: 'admin.users.searchPlaceholder' }), {
      target: { value: 'juan@' },
    })

    await waitFor(() => {
      expect(screen.getByText('juan@test.com')).toBeInTheDocument()
    })
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()
  })

  it('muestra "Sin resultados" cuando ninguna cuenta coincide', async () => {
    render(<UsersSection />)

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument())
    fireEvent.change(screen.getByRole('textbox', { name: 'admin.users.searchPlaceholder' }), {
      target: { value: 'zzz' },
    })

    await waitFor(() => {
      expect(screen.getByText('admin.noResults')).toBeInTheDocument()
    })
  })

  it('suspende a un usuario eligiendo duración', async () => {
    render(<UsersSection />)

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'admin.users.suspend.short' }))

    await waitFor(() => {
      expect(screen.getByText('admin.users.suspend.confirm')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'admin.users.suspend.confirm' }))

    await waitFor(() => {
      expect(adminApiMock.setUserStatus).toHaveBeenCalledWith('u1', 'suspended', expect.any(String))
    })
  })

  it('banea a un usuario tras confirmar', async () => {
    render(<UsersSection />)

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'admin.users.ban' }))

    await waitFor(() => {
      expect(screen.getByText('admin.users.banMessage')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'admin.users.banConfirm' }))

    await waitFor(() => {
      expect(adminApiMock.setUserStatus).toHaveBeenCalledWith('u1', 'banned', undefined)
    })
  })

  it('reactiva a un usuario suspendido o baneado', async () => {
    render(<UsersSection />)

    await waitFor(() => expect(screen.getByText('juan@test.com')).toBeInTheDocument())
    const reactivateButtons = screen.getAllByRole('button', { name: 'admin.users.reactivate' })
    fireEvent.click(reactivateButtons[0])

    await waitFor(() => {
      expect(adminApiMock.setUserStatus).toHaveBeenCalledWith('u2', 'active', undefined)
    })
  })

  it('elimina a un usuario tras confirmar', async () => {
    render(<UsersSection />)

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'admin.users.deleteAccount ana@test.com' }))

    await waitFor(() => {
      expect(screen.getByText('admin.users.deleteMessage')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /^common\.delete$/ }))

    await waitFor(() => {
      expect(adminApiMock.deleteUser).toHaveBeenCalledWith('u1')
    })
  })

  it('no muestra acciones destructivas en cuentas protegidas', async () => {
    render(<UsersSection />)

    await waitFor(() => expect(screen.getByText('Lucia')).toBeInTheDocument())
    expect(screen.getAllByText('admin.users.protected').length).toBe(1)
    const luciaRow = screen.getByText('Lucia').closest('div')
    expect(luciaRow?.querySelector('button[aria-label*="deleteAccount"]')).toBeNull()
  })
})
