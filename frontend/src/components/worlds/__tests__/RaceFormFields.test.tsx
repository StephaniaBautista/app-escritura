import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EMPTY_RACE_FORM, RaceFormFields } from '../RaceFormFields'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/stores/toast-store', () => ({
  useToastStore: () => ({ error: vi.fn() }),
}))

describe('RaceFormFields', () => {
  it('muestra imagen, secciones y campos de la ficha', () => {
    render(
      <RaceFormFields form={EMPTY_RACE_FORM} onChange={vi.fn()} pdfFile={null} onPdfFile={vi.fn()} onRemovePdf={vi.fn()} isSaving={false} />,
    )

    expect(screen.getByRole('button', { name: 'worldApp.raceUploadImage' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('worldApp.raceNamePlaceholder')).toBeInTheDocument()
    expect(screen.getByText('worldApp.raceBodySpirit')).toBeInTheDocument()
    expect(screen.getByText('worldApp.raceCultureWorld')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('worldApp.raceSpiritualPlaceholder')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('worldApp.raceRelationsPlaceholder')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('worldApp.raceNotesPlaceholder')).toBeInTheDocument()
    expect(screen.getByText('worldApp.attachPdf')).toBeInTheDocument()
  })
})
