import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VersionsPanel } from '../VersionsPanel'

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
  loadVersions: vi.fn().mockResolvedValue(undefined),
  createVersion: vi.fn().mockResolvedValue(undefined),
  getVersion: vi.fn().mockResolvedValue(null),
  restoreVersion: vi.fn().mockResolvedValue(undefined),
}

describe('VersionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDocumentStoreMock.mockReturnValue(baseStore)
  })

  it('carga las versiones del documento al abrirse', async () => {
    render(<VersionsPanel documentId="doc-1" onClose={vi.fn()} />)

    await waitFor(() => {
      expect(baseStore.loadVersions).toHaveBeenCalledWith('doc-1')
    })
  })

  it('cierra con el botón X', () => {
    const onClose = vi.fn()
    render(<VersionsPanel documentId="doc-1" onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'editorApp.panelClose' }))

    expect(onClose).toHaveBeenCalled()
  })

  it('cierra con la tecla Escape', () => {
    const onClose = vi.fn()
    render(<VersionsPanel documentId="doc-1" onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })

  it('no cierra al hacer click dentro del panel', () => {
    const onClose = vi.fn()
    render(<VersionsPanel documentId="doc-1" onClose={onClose} />)

    fireEvent.click(screen.getByRole('dialog'))

    expect(onClose).not.toHaveBeenCalled()
  })
})