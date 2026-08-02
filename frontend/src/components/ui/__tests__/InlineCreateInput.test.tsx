import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InlineCreateInput } from '../InlineCreateInput'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('InlineCreateInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('dispara onSubmit al pulsar Enter con valor', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<InlineCreateInput placeholder="Título" onSubmit={onSubmit} onCancel={vi.fn()} />)

    const input = screen.getByPlaceholderText('Título')
    fireEvent.change(input, { target: { value: 'Capítulo 1' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
    expect(onSubmit).toHaveBeenCalledWith('Capítulo 1')
  })

  it('NO dispara onSubmit dos veces con doble Enter mientras crea', async () => {
    let resolveSubmit: () => void = () => {}
    const onSubmit = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { resolveSubmit = resolve }))
    render(<InlineCreateInput placeholder="Título" onSubmit={onSubmit} onCancel={vi.fn()} />)

    const input = screen.getByPlaceholderText('Título')
    fireEvent.change(input, { target: { value: 'Capítulo 1' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    resolveSubmit()
    await waitFor(() => {
      expect(input).not.toBeDisabled()
    })
  })

  it('deshabilita el input y muestra spinner mientras envía', async () => {
    let resolveSubmit: () => void = () => {}
    const onSubmit = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { resolveSubmit = resolve }))
    render(<InlineCreateInput placeholder="Título" onSubmit={onSubmit} onCancel={vi.fn()} />)

    const input = screen.getByPlaceholderText('Título')
    fireEvent.change(input, { target: { value: 'Capítulo 1' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(input).toBeDisabled()
    })
    expect(screen.getByLabelText('common.loading')).toBeInTheDocument()

    resolveSubmit()
  })

  it('no cancela con Escape mientras envía', async () => {
    let resolveSubmit: () => void = () => {}
    const onSubmit = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { resolveSubmit = resolve }))
    const onCancel = vi.fn()
    render(<InlineCreateInput placeholder="Título" onSubmit={onSubmit} onCancel={onCancel} />)

    const input = screen.getByPlaceholderText('Título')
    fireEvent.change(input, { target: { value: 'Capítulo 1' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyDown(input, { key: 'Escape' })

    await waitFor(() => {
      expect(onCancel).not.toHaveBeenCalled()
    })

    resolveSubmit()
  })

  it('cancela con Escape cuando no está enviando', () => {
    const onCancel = vi.fn()
    render(<InlineCreateInput placeholder="Título" onSubmit={vi.fn().mockResolvedValue(undefined)} onCancel={onCancel} />)

    fireEvent.keyDown(screen.getByPlaceholderText('Título'), { key: 'Escape' })

    expect(onCancel).toHaveBeenCalled()
  })

  it('no envía con Enter si el valor está vacío', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<InlineCreateInput placeholder="Título" onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.keyDown(screen.getByPlaceholderText('Título'), { key: 'Enter' })

    expect(onSubmit).not.toHaveBeenCalled()
  })
})