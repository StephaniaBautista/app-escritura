import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { EMPTY_LORE_FORM, LoreFormFields } from '../LoreFormFields'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('LoreFormFields', () => {
  it('muestra título, placeholder de tipo, guía de descripción y detalles de ficha', () => {
    const onChange = vi.fn()
    render(
      <LoreFormFields
        form={EMPTY_LORE_FORM}
        onChange={onChange}
        pdfFile={null}
        onPdfFile={vi.fn()}
        onRemovePdf={vi.fn()}
        isSaving={false}
      />,
    )

    expect(screen.getByLabelText('worldApp.loreTitle')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('worldApp.loreTitlePlaceholder')).toBeInTheDocument()
    expect(screen.getByText('worldApp.loreTypePlaceholder')).toBeInTheDocument()
    expect(screen.getByText('worldApp.loreDescriptionHint')).toBeInTheDocument()
    expect(screen.getByLabelText('worldApp.powerSource')).toBeInTheDocument()
    expect(screen.getByLabelText('worldApp.rulesLimits')).toBeInTheDocument()
    expect(screen.getByLabelText('worldApp.cost')).toBeInTheDocument()
    expect(screen.getByLabelText('worldApp.usedBy')).toBeInTheDocument()
    expect(screen.getByText('worldApp.attachPdf')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('worldApp.loreTitle'), { target: { value: 'Runas' } })
    expect(onChange).toHaveBeenCalledWith({ name: 'Runas' })
  })
})
