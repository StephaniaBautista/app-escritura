import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { PostIt } from '../PostIt'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const note = {
  id: 'note-1',
  title: 'Idea para el final',
  content: 'El bosque aparece al amanecer',
  documentId: 'doc-1',
  projectId: 'proj-1',
  isHidden: false,
  userId: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('PostIt', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra título y preview del contenido', () => {
    render(<PostIt note={note} onUpdate={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByText('Idea para el final')).toBeInTheDocument()
    expect(screen.getByText('El bosque aparece al amanecer')).toBeInTheDocument()
  })

  it('expande/colapsa el textarea de edición', () => {
    render(<PostIt note={note} onUpdate={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.queryByPlaceholderText('notes.contentPlaceholder')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Idea para el final/ }))
    expect(screen.getByPlaceholderText('notes.contentPlaceholder')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Idea para el final/ }))
    expect(screen.queryByPlaceholderText('notes.contentPlaceholder')).not.toBeInTheDocument()
  })

  it('guarda el contenido con debounce al editar', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    render(<PostIt note={note} onUpdate={onUpdate} onDelete={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /Idea para el final/ }))
    const textarea = screen.getByPlaceholderText('notes.contentPlaceholder')
    fireEvent.change(textarea, { target: { value: 'Contenido editado' } })

    expect(onUpdate).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(700)
    })

    expect(onUpdate).toHaveBeenCalledWith('note-1', { content: 'Contenido editado' })
  })

  it('oculta la nota con el botón ojo', () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    render(<PostIt note={note} onUpdate={onUpdate} onDelete={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'postit.hide' }))

    expect(onUpdate).toHaveBeenCalledWith('note-1', { isHidden: true })
  })

  it('en modo compacto muestra botón restaurar en vez del preview', () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    render(<PostIt note={note} onUpdate={onUpdate} onDelete={vi.fn()} compact />)

    expect(screen.getByRole('button', { name: 'postit.restore' })).toBeInTheDocument()
    expect(screen.queryByText('El bosque aparece al amanecer')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'postit.restore' }))
    expect(onUpdate).toHaveBeenCalledWith('note-1', { isHidden: false })
  })

  it('elimina con KebabMenu', () => {
    const onDelete = vi.fn()
    render(<PostIt note={note} onUpdate={vi.fn()} onDelete={onDelete} />)

    fireEvent.click(screen.getByRole('button', { name: 'common.moreOptions' }))
    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }))

    expect(onDelete).toHaveBeenCalledWith('note-1')
  })
})