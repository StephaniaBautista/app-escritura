import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InlineComments } from '../InlineComments'
import type { SharedComment } from '@/services/sharing'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const comment: SharedComment = {
  id: 'c1',
  blockIndex: 0,
  quote: 'Ada llega.',
  body: 'Mejorar el ritmo',
  authorName: 'Anónimo',
  resolved: false,
  createdAt: '2026-10-10T10:00:00Z',
  orphan: false,
  effectiveBlockIndex: 0,
}

describe('InlineComments', () => {
  const onSend = vi.fn().mockResolvedValue(undefined)
  const onResolve = vi.fn().mockResolvedValue(undefined)
  const onDelete = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends a comment for the active paragraph with optional author', async () => {
    render(
      <InlineComments
        comments={[]}
        activeBlock={1}
        allowComments
        isAuthenticated={false}
        onSend={onSend}
        onResolve={onResolve}
        onDelete={onDelete}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText('sharingApp.authorPlaceholder'), { target: { value: 'Ivar' } })
    fireEvent.change(screen.getByPlaceholderText('sharingApp.commentPlaceholder'), { target: { value: '  Genial  ' } })
    fireEvent.click(screen.getByText('sharingApp.sendAnonymous'))
    await waitFor(() =>
      expect(onSend).toHaveBeenCalledWith({ blockIndex: 1, quote: '', body: 'Genial', authorName: 'Ivar' }),
    )
  })

  it('disables the composer without an active paragraph', () => {
    render(
      <InlineComments
        comments={[]}
        activeBlock={null}
        allowComments
        isAuthenticated
        onSend={onSend}
        onResolve={onResolve}
        onDelete={onDelete}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText('sharingApp.commentPlaceholder'), { target: { value: 'hola' } })
    const send = screen.getByText('sharingApp.send') as HTMLButtonElement
    expect(send.disabled).toBe(true)
  })

  it('shows attached and orphaned comments', () => {
    const orphan: SharedComment = { ...comment, id: 'c2', orphan: true, effectiveBlockIndex: null, body: 'Huérfano' }
    render(
      <InlineComments
        comments={[comment, orphan]}
        activeBlock={0}
        allowComments={false}
        isAuthenticated={false}
        onSend={onSend}
        onResolve={onResolve}
        onDelete={onDelete}
      />,
    )
    expect(screen.getByText('Mejorar el ritmo')).toBeTruthy()
    expect(screen.getByText('sharingApp.orphanComments')).toBeTruthy()
    expect(screen.getByText('Huérfano')).toBeTruthy()
    expect(screen.queryByPlaceholderText('sharingApp.commentPlaceholder')).toBeNull()
  })

  it('resolves and deletes comments', () => {
    render(
      <InlineComments
        comments={[comment]}
        activeBlock={0}
        allowComments={false}
        isAuthenticated
        onSend={onSend}
        onResolve={onResolve}
        onDelete={onDelete}
      />,
    )
    fireEvent.click(screen.getByText('sharingApp.resolve'))
    expect(onResolve).toHaveBeenCalledWith('c1', true)
    fireEvent.click(screen.getByText('sharingApp.delete'))
    expect(onDelete).toHaveBeenCalledWith('c1')
  })
})
