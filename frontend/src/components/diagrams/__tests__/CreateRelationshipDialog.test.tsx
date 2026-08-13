import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CreateRelationshipDialog } from '../CreateRelationshipDialog'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

function renderDialog(initial?: Parameters<typeof CreateRelationshipDialog>[0]['initial']) {
  const onSave = vi.fn(async () => undefined)
  const onCancel = vi.fn()
  render(
    <CreateRelationshipDialog
      sourceName="Lyra"
      targetName="Will"
      initial={initial}
      onSave={onSave}
      onCancel={onCancel}
    />,
  )
  return { onSave, onCancel }
}

describe('CreateRelationshipDialog', () => {
  it('crea relación Otra con color y estilo', async () => {
    const { onSave } = renderDialog()

    fireEvent.change(screen.getByLabelText('diagramApp.selectRelationshipType'), {
      target: { value: 'custom' },
    })
    fireEvent.change(screen.getByPlaceholderText('diagramApp.customLabelPlaceholder'), {
      target: { value: 'Rivales' },
    })
    fireEvent.click(screen.getByRole('button', { name: '#22c55e' }))
    fireEvent.click(screen.getByRole('button', { name: 'diagramApp.style_dashed' }))
    fireEvent.click(screen.getByRole('button', { name: 'characterApp.relSave' }))

    expect(onSave).toHaveBeenCalledWith({
      type: 'custom',
      label: 'Rivales',
      description: null,
      lineColor: '#22c55e',
      lineStyle: 'dashed',
    })
  })

  it('edita mostrando los valores iniciales de color y estilo', async () => {
    const { onSave } = renderDialog({
      type: 'custom',
      label: 'Rivales',
      description: 'Se odian desde niños',
      lineColor: '#22c55e',
      lineStyle: 'dashed',
    })

    expect(screen.getByText('diagramApp.editRelationship')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '#22c55e' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'diagramApp.style_dashed' })).toHaveAttribute('aria-pressed', 'true')
    expect((screen.getByLabelText('diagramApp.selectRelationshipType') as HTMLSelectElement).value).toBe('custom')

    fireEvent.click(screen.getByRole('button', { name: 'diagramApp.style_solid' }))
    fireEvent.click(screen.getByRole('button', { name: 'diagramApp.editSave' }))

    expect(onSave).toHaveBeenCalledWith({
      type: 'custom',
      label: 'Rivales',
      description: 'Se odian desde niños',
      lineColor: '#22c55e',
      lineStyle: 'solid',
    })
  })

  it('si el tipo no es Otra, no envía color ni estilo', async () => {
    const { onSave } = renderDialog()

    fireEvent.change(screen.getByLabelText('diagramApp.selectRelationshipType'), {
      target: { value: 'romance' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'characterApp.relSave' }))

    expect(onSave).toHaveBeenCalledWith({
      type: 'romance',
      label: null,
      description: null,
      lineColor: null,
      lineStyle: null,
    })
  })
})
