import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VersionsList } from '../VersionsList'

const { useDocumentStoreMock } = vi.hoisted(() => ({ useDocumentStoreMock: vi.fn() }))

vi.mock('@/stores/document-store', () => ({
  useDocumentStore: useDocumentStoreMock,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const baseStore = {
  versions: [],
  versionsLoading: false,
  createVersion: vi.fn().mockResolvedValue(undefined),
  getVersion: vi.fn().mockResolvedValue(null),
  restoreVersion: vi.fn().mockResolvedValue(undefined),
}

const versionRow = {
  id: 'ver-1',
  documentId: 'doc-1',
  title: 'Capítulo 1',
  content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hola mundo' }] }] },
  version: 1,
  userId: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
}

describe('VersionsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDocumentStoreMock.mockReturnValue(baseStore)
  })

  it('muestra el estado vacío cuando no hay versiones', () => {
    render(<VersionsList documentId="doc-1" />)

    expect(screen.getByText('versions.empty')).toBeInTheDocument()
  })

  it('crea una versión al pulsar el botón', async () => {
    render(<VersionsList documentId="doc-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'versions.newVersion' }))

    await waitFor(() => {
      expect(baseStore.createVersion).toHaveBeenCalledWith('doc-1')
    })
  })

  it('lista versiones con número, título y fecha', () => {
    useDocumentStoreMock.mockReturnValue({ ...baseStore, versions: [versionRow] })

    render(<VersionsList documentId="doc-1" />)

    expect(screen.getByText('versions.versionNum')).toBeInTheDocument()
    expect(screen.getByText(/Capítulo 1/)).toBeInTheDocument()
  })

  it('restaura una versión tras confirmar', async () => {
    useDocumentStoreMock.mockReturnValue({ ...baseStore, versions: [versionRow] })

    render(<VersionsList documentId="doc-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'versions.restore' }))
    const restoreButtons = screen.getAllByRole('button', { name: 'versions.restore' })
    fireEvent.click(restoreButtons[restoreButtons.length - 1])

    await waitFor(() => {
      expect(baseStore.restoreVersion).toHaveBeenCalledWith('ver-1')
    })
  })})