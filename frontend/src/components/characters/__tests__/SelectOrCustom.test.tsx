import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SelectOrCustom } from '../SelectOrCustom'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const options = [{ value: 'A', label: 'Opción A' }]

describe('SelectOrCustom', () => {
  it('mantiene el select siempre visible con sus opciones', () => {
    render(<SelectOrCustom value={null} options={options} onChange={vi.fn()} />)

    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Opción A' })).toBeInTheDocument()
    expect(screen.queryByText('characterApp.customOption')).not.toBeInTheDocument()
  })

  it('abre el input con el botón + y agrega la opción escrita al select', () => {
    const onChange = vi.fn()
    render(<SelectOrCustom value={null} options={options} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('characterApp.customOption'))
    fireEvent.change(screen.getByPlaceholderText('characterApp.customAddPlaceholder'), { target: { value: 'Fluido' } })
    fireEvent.click(screen.getByLabelText('characterApp.customAddConfirm'))

    expect(onChange).toHaveBeenCalledWith('Fluido')
    expect(screen.getByRole('option', { name: 'Fluido' })).toBeInTheDocument()
  })

  it('si la opción escrita ya existe, selecciona la existente', () => {
    const onChange = vi.fn()
    render(<SelectOrCustom value={null} options={options} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('characterApp.customOption'))
    fireEvent.change(screen.getByPlaceholderText('characterApp.customAddPlaceholder'), { target: { value: 'opción a' } })
    fireEvent.keyDown(screen.getByPlaceholderText('characterApp.customAddPlaceholder'), { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith('A')
    expect(screen.queryByRole('option', { name: 'opción a' })).not.toBeInTheDocument()
  })

  it('un valor custom guardado aparece como opción seleccionada', () => {
    render(<SelectOrCustom value="Otro valor" options={options} onChange={vi.fn()} />)

    expect(screen.getByRole('option', { name: 'Otro valor' })).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('Otro valor')
  })

  it('elegir la opción vacía limpia el valor', () => {
    const onChange = vi.fn()
    render(<SelectOrCustom value="A" options={options} onChange={onChange} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } })

    expect(onChange).toHaveBeenCalledWith(null)
  })
})
