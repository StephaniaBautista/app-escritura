import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StoryStructureTab } from '../StoryStructureTab'

const { storyBankApiMock } = vi.hoisted(() => ({
  storyBankApiMock: { listQuestions: vi.fn() },
}))

vi.mock('@/services/story-bank', () => ({ storyBankApi: storyBankApiMock }))

vi.mock('../StructureDialog', () => ({
  StructureDialog: () => null,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}))

const questions = [
  { id: 'q-1', text: '¿Qué secreto guarda?', textEn: null, isDefault: true, createdAt: '' },
]

describe('StoryStructureTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storyBankApiMock.listQuestions.mockResolvedValue(questions)
  })

  it('muestra estado vacío si no hay contenido', () => {
    render(<StoryStructureTab projectId="p-1" storyMeta={{}} />)
    expect(screen.getByText('storySetup.structureEmpty')).toBeInTheDocument()
  })

  it('muestra secciones legacy migradas', () => {
    render(
      <StoryStructureTab
        projectId="p-1"
        storyMeta={{ structure: { inicio: 'Primera escena', final: 'Cierre' } as never }}
      />,
    )

    expect(screen.getByText('storySetup.structureInicio')).toBeInTheDocument()
    expect(screen.getByText('Primera escena')).toBeInTheDocument()
    expect(screen.getByText('Cierre')).toBeInTheDocument()
  })

  it('muestra secciones custom y respuestas de preguntas', async () => {
    render(
      <StoryStructureTab
        projectId="p-1"
        storyMeta={{
          structure: {
            templateId: 't-1',
            sections: [
              { id: 'inicio', content: 'A', answers: { 'q-1': 'Un secreto' } },
              { id: 'epilogo', title: 'Epílogo', content: 'Final alternativo' },
            ],
          },
        }}
      />,
    )

    expect(screen.getByText('Epílogo')).toBeInTheDocument()
    expect(screen.getByText('Final alternativo')).toBeInTheDocument()
    expect(await screen.findByText('¿Qué secreto guarda?')).toBeInTheDocument()
    expect(screen.getByText('Un secreto')).toBeInTheDocument()
  })

  it('muestra los nuevos campos guiados y estados por personaje', () => {
    render(
      <StoryStructureTab
        projectId="p-1"
        storyMeta={{
          worldContext: 'Un reino en guerra',
          initialSituation: 'La princesa huye',
          centralTheme: 'El perdón',
          problems: 'Una guerra civil',
          characters: [{ name: 'Aria', isOC: false, initialState: 'Ansiosa', initialPhysicalState: 'Herida' }],
        }}
      />,
    )

    expect(screen.getByText('storySetup.guidedWorldContext')).toBeInTheDocument()
    expect(screen.getByText('Un reino en guerra')).toBeInTheDocument()
    expect(screen.getByText('storySetup.guidedCentralTheme')).toBeInTheDocument()
    expect(screen.getByText('Aria')).toBeInTheDocument()
    expect(screen.getByText('Ansiosa')).toBeInTheDocument()
    expect(screen.getByText('Herida')).toBeInTheDocument()
  })
})
