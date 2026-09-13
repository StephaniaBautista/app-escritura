import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { EMPTY_CREATURE_FORM, CreatureFormFields } from '../CreatureFormFields'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/stores/toast-store', () => ({
  useToastStore: () => ({ error: vi.fn() }),
}))

describe('CreatureFormFields', () => {
  it('muestra imagen, nombre, especie, peligro y descripción', () => {
    const onChange = vi.fn()
    render(
      <CreatureFormFields form={EMPTY_CREATURE_FORM} onChange={onChange} isSaving={false} />,
    )

    expect(screen.getByRole('button', { name: 'worldApp.creatureUploadImage' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('worldApp.creatureNamePlaceholder')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('worldApp.creatureSpeciesPlaceholder')).toBeInTheDocument()
    expect(screen.getByLabelText('worldApp.dangerLabel')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('worldApp.creatureDescriptionPlaceholder')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('worldApp.creatureNamePlaceholder'), {
      target: { value: 'Wyvern' },
    })
    expect(onChange).toHaveBeenCalledWith({ name: 'Wyvern' })
  })
})
