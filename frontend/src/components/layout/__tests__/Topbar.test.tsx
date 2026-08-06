import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Topbar } from '../Topbar'

const navigateMock = vi.fn()

vi.mock('react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: currentPath }),
  useNavigate: () => navigateMock,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

let currentPath = '/app'

describe('Topbar: botón volver en el editor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentPath = '/app'
  })

  it('muestra el botón volver en /app/editor/:projectId/:documentId', () => {
    currentPath = '/app/editor/proj-1/doc-1'
    render(<Topbar />)

    expect(screen.getByLabelText('common.back')).toBeInTheDocument()
  })

  it('no muestra el botón volver fuera del editor', () => {
    render(<Topbar />)

    expect(screen.queryByLabelText('common.back')).not.toBeInTheDocument()
  })

  it('vuelve a la carpeta del proyecto desde un documento', () => {
    currentPath = '/app/editor/proj-1/doc-1'
    render(<Topbar />)

    fireEvent.click(screen.getByLabelText('common.back'))

    expect(navigateMock).toHaveBeenCalledWith('/app/documents/proj-1')
  })

  it('vuelve al dashboard desde /app/editor sin proyecto', () => {
    currentPath = '/app/editor'
    render(<Topbar />)

    fireEvent.click(screen.getByLabelText('common.back'))

    expect(navigateMock).toHaveBeenCalledWith('/app')
  })
})