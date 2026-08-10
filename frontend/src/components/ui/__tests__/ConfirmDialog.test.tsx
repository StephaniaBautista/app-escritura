import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ConfirmDialog } from '../ConfirmDialog'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const renderDialog = (props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) => {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <ConfirmDialog
      isOpen
      title="Eliminar"
      message="¿Seguro que quieres eliminarlo?"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  )
  return { onConfirm, onCancel }
}

describe('ConfirmDialog', () => {
  it('muestra título, mensaje y botones por defecto', () => {
    renderDialog()

    expect(screen.getByText('Eliminar')).toBeInTheDocument()
    expect(screen.getByText('¿Seguro que quieres eliminarlo?')).toBeInTheDocument()
    expect(screen.getByText('common.cancel')).toBeInTheDocument()
    expect(screen.getByText('common.confirm')).toBeInTheDocument()
  })

  it('confirma y cancela sin estado de carga', () => {
    const { onConfirm, onCancel } = renderDialog()

    fireEvent.click(screen.getByText('common.confirm'))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('common.cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('Escape y backdrop cierran el diálogo sin estado de carga', () => {
    const { onCancel } = renderDialog()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)

    const backdrop = screen.getByText('Eliminar').closest('.fixed')
    expect(backdrop).toBeTruthy()
    fireEvent.click(backdrop as HTMLElement)
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('con loading: spinner en confirmar y botones deshabilitados', () => {
    renderDialog({ loading: true })

    expect(screen.getByTestId('confirm-loading-spinner')).toBeInTheDocument()
    expect(screen.queryByText('common.confirm')).not.toBeInTheDocument()
    expect(screen.getByText('common.cancel')).toBeDisabled()
    expect(screen.getByTestId('confirm-loading-spinner').closest('button')).toBeDisabled()
  })

  it('con loading: Escape y backdrop NO cierran el diálogo', () => {
    const { onConfirm, onCancel } = renderDialog({ loading: true })

    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByText('common.cancel'))
    const backdrop = screen.getByText('Eliminar').closest('.fixed')
    fireEvent.click(backdrop as HTMLElement)

    expect(onCancel).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
