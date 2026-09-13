import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { EMPTY_GLOSSARY_FORM, GlossaryFormFields } from '../GlossaryFormFields'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('GlossaryFormFields', () => {
  it('muestra lema, pronunciación y significado de ficha', () => {
    const onChange = vi.fn()
    render(
      <GlossaryFormFields form={EMPTY_GLOSSARY_FORM} onChange={onChange} isSaving={false} />,
    )

    expect(screen.getByLabelText('worldApp.word')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('worldApp.glossaryWordPlaceholder')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('worldApp.glossaryPronunciationPlaceholder')).toBeInTheDocument()
    expect(screen.getByLabelText('worldApp.meaning')).toBeInTheDocument()
    expect(screen.getByText('worldApp.glossaryMeaningHint')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('worldApp.word'), { target: { value: 'Aether' } })
    expect(onChange).toHaveBeenCalledWith({ word: 'Aether' })
  })
})
