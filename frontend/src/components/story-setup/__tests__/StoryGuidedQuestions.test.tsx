import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StoryGuidedQuestions } from '../StoryGuidedQuestions'

const { storyBankApiMock, optionsStoreMock } = vi.hoisted(() => ({
  storyBankApiMock: { listQuestions: vi.fn() },
  optionsStoreMock: vi.fn(),
}))

vi.mock('@/services/story-bank', () => ({ storyBankApi: storyBankApiMock }))

vi.mock('@/stores/options-store', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/stores/options-store')>()
  return { ...mod, useOptionsStore: optionsStoreMock }
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}))

const bankQuestions = [
  { id: 'q-1', text: '¿Qué secreto guarda el protagonista?', textEn: null, isDefault: true, createdAt: '' },
  { id: 'q-2', text: '¿Qué miedo tiene?', textEn: 'What is their fear?', isDefault: true, createdAt: '' },
]

const optionsState = {
  options: {},
  loading: {},
  loadOptions: vi.fn(),
  addOption: vi.fn(),
  removeOption: vi.fn(),
  getOptions: vi.fn().mockReturnValue([]),
}

describe('StoryGuidedQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storyBankApiMock.listQuestions.mockResolvedValue(bankQuestions)
    optionsStoreMock.mockImplementation((selector?: (state: typeof optionsState) => unknown) => {
      if (typeof selector === 'function') return selector(optionsState)
      return optionsState
    })
  })

  it('muestra las preguntas generales en lugar de estado mental/físico', () => {
    render(<StoryGuidedQuestions meta={{}} update={vi.fn()} />)

    expect(screen.getByText('storySetup.guidedWorldContext')).toBeInTheDocument()
    expect(screen.getByText('storySetup.guidedInitialSituation')).toBeInTheDocument()
    expect(screen.getByText('storySetup.guidedCentralTheme')).toBeInTheDocument()
    expect(screen.queryByText('storySetup.guidedMentalState')).not.toBeInTheDocument()
    expect(screen.queryByText('storySetup.guidedPhysicalState')).not.toBeInTheDocument()
  })

  it('los problemas son un campo de texto abierto (textarea)', () => {
    const update = vi.fn()
    render(<StoryGuidedQuestions meta={{}} update={update} />)

    const textareas = screen.getAllByRole('textbox')
    const problems = textareas.find((el) => el.id === 'guided-problems')
    expect(problems).toBeDefined()
    expect(problems?.tagName).toBe('TEXTAREA')

    fireEvent.change(problems!, { target: { value: 'Una guerra civil que separa a la familia' } })
    expect(update).toHaveBeenCalledWith({ problems: 'Una guerra civil que separa a la familia' })
  })

  it('añade preguntas del banco y permite responderlas', async () => {
    const update = vi.fn()
    render(<StoryGuidedQuestions meta={{}} update={update} />)

    const addBtn = screen.getByText('storySetup.bankAdd')
    await waitFor(() => expect(addBtn).not.toBeDisabled())
    fireEvent.click(addBtn)
    fireEvent.click(await screen.findByText('¿Qué secreto guarda el protagonista?'))

    expect(update).toHaveBeenCalledWith({ bankAnswers: { 'q-1': '' } })
  })

  it('elimina una pregunta del banco ya añadida', () => {
    const update = vi.fn()
    render(<StoryGuidedQuestions meta={{ bankAnswers: { 'q-1': 'Un pasado oculto' } }} update={update} />)

    fireEvent.click(screen.getByLabelText('common.remove'))
    expect(update).toHaveBeenCalledWith({ bankAnswers: {} })
  })

  it('no muestra preguntas ya respondidas en la lista disponible', async () => {
    render(<StoryGuidedQuestions meta={{ bankAnswers: { 'q-1': 'x' } }} update={vi.fn()} />)

    const addBtn = screen.getByText('storySetup.bankAdd')
    await waitFor(() => expect(addBtn).not.toBeDisabled())
    fireEvent.click(addBtn)
    await waitFor(() => {
      expect(screen.getByText('¿Qué miedo tiene?')).toBeInTheDocument()
      expect(screen.queryAllByText('¿Qué secreto guarda el protagonista?')).toHaveLength(1)
    })
  })

  it('edita la respuesta de una pregunta del banco', async () => {
    const update = vi.fn()
    render(<StoryGuidedQuestions meta={{ bankAnswers: { 'q-1': '' } }} update={update} />)

    const textarea = await screen.findByLabelText('¿Qué secreto guarda el protagonista?')
    fireEvent.change(textarea, { target: { value: 'Esconde su identidad' } })
    expect(update).toHaveBeenCalledWith({ bankAnswers: { 'q-1': 'Esconde su identidad' } })
  })
})
