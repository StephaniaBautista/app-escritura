import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StoryStructure } from '../StoryStructure'
import type { StoryMeta } from '@/types/story'

const { storyBankApiMock } = vi.hoisted(() => ({
  storyBankApiMock: {
    listTemplates: vi.fn(),
    listQuestions: vi.fn(),
  },
}))

vi.mock('@/services/story-bank', () => ({
  storyBankApi: storyBankApiMock,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}))

const templates = [
  {
    id: 't-1',
    name: 'Inicio y Final',
    nameEn: null,
    description: null,
    descriptionEn: null,
    sections: [
      { id: 'inicio', questionIds: ['q-1'] },
      { id: 'final', questionIds: [] },
    ],
    isDefault: true,
    createdAt: '',
  },
]

const questions = [
  { id: 'q-1', text: '¿Qué evento del pasado marca al protagonista?', textEn: null, isDefault: true, createdAt: '' },
  { id: 'q-2', text: '¿Qué secreto guarda?', textEn: 'What secret?', isDefault: true, createdAt: '' },
]

function renderFree(meta: StoryMeta = {}, update = vi.fn()) {
  return { update, ...render(<StoryStructure meta={{ guidedMode: false, ...meta }} update={update} />) }
}

function renderGuided(meta: StoryMeta = {}, update = vi.fn()) {
  return { update, ...render(<StoryStructure meta={{ guidedMode: true, ...meta }} update={update} />) }
}

function ControlledGuided({ initialMeta }: { initialMeta: StoryMeta }) {
  const [meta, setMeta] = useState<StoryMeta>({ guidedMode: true, ...initialMeta })
  const update = (patch: Partial<StoryMeta>) => setMeta((m) => ({ ...m, ...patch }))
  return <StoryStructure meta={meta} update={update} />
}

describe('StoryStructure — modo libre', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('no consulta el banco en modo libre', () => {
    renderFree()
    expect(storyBankApiMock.listTemplates).not.toHaveBeenCalled()
    expect(storyBankApiMock.listQuestions).not.toHaveBeenCalled()
  })

  it('muestra las 4 secciones estándar como toggles', () => {
    renderFree()
    for (const key of ['storySetup.structureInicio', 'storySetup.structureDesarrollo', 'storySetup.structureClimax', 'storySetup.structureFinal']) {
      expect(screen.getByText(key)).toBeInTheDocument()
    }
  })

  it('activa una sección al hacer click y guarda su contenido', () => {
    const update = vi.fn()
    renderFree({}, update)

    fireEvent.click(screen.getByText('storySetup.structureInicio'))
    expect(update).toHaveBeenCalledWith({ structure: { sections: [{ id: 'inicio', content: '' }] } })
  })

  it('desactiva una sección marcada', () => {
    const update = vi.fn()
    renderFree({ structure: { sections: [{ id: 'inicio', content: 'Algo' }] } }, update)

    fireEvent.click(screen.getAllByText('storySetup.structureInicio')[0])
    expect(update).toHaveBeenCalledWith({ structure: { sections: [] } })
  })

  it('permite añadir secciones personalizadas', () => {
    const update = vi.fn()
    renderFree({}, update)

    fireEvent.change(screen.getByPlaceholderText('storySetup.customSectionPlaceholder'), {
      target: { value: 'Epílogo' },
    })
    fireEvent.click(screen.getByText('storySetup.addSection'))

    expect(update).toHaveBeenCalledWith({
      structure: { sections: [expect.objectContaining({ title: 'Epílogo', content: '' })] },
    })
  })

  it('permite eliminar secciones personalizadas', () => {
    const update = vi.fn()
    renderFree(
      {
        structure: {
          sections: [
            { id: 'inicio', content: 'x' },
            { id: 'custom-1', title: 'Epílogo', content: 'y' },
          ],
        },
      },
      update,
    )

    fireEvent.click(screen.getByLabelText('common.remove'))
    expect(update).toHaveBeenCalledWith({ structure: { sections: [{ id: 'inicio', content: 'x' }] } })
  })

  it('edita el contenido de una sección', () => {
    const update = vi.fn()
    renderFree({ structure: { sections: [{ id: 'inicio', content: '' }] } }, update)

    const textarea = screen.getAllByRole('textbox')[1]
    fireEvent.change(textarea, { target: { value: 'La primera escena' } })
    expect(update).toHaveBeenCalledWith({ structure: { sections: [{ id: 'inicio', content: 'La primera escena' }] } })
  })
})

describe('StoryStructure — modo guiado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storyBankApiMock.listTemplates.mockResolvedValue(templates)
    storyBankApiMock.listQuestions.mockResolvedValue(questions)
  })

  it('carga plantillas del banco al entrar en guiado', async () => {
    renderGuided()
    await waitFor(() => {
      expect(storyBankApiMock.listTemplates).toHaveBeenCalled()
      expect(screen.getByText('storySetup.templateQuestion')).toBeInTheDocument()
    })
  })

  it('seleccionar una plantilla crea sus secciones', async () => {
    const update = vi.fn()
    renderGuided({}, update)

    fireEvent.click(await screen.findByText('Inicio y Final'))
    expect(update).toHaveBeenCalledWith({
      structure: {
        templateId: 't-1',
        sections: [
          { id: 'inicio', content: '', answers: {} },
          { id: 'final', content: '', answers: {} },
        ],
      },
    })
  })

  it('muestra las preguntas de la sección y guarda las respuestas', async () => {
    const update = vi.fn()
    renderGuided(
      {
        structure: {
          templateId: 't-1',
          sections: [
            { id: 'inicio', content: '', answers: {} },
            { id: 'final', content: '', answers: {} },
          ],
        },
      },
      update,
    )

    expect(await screen.findByText('¿Qué evento del pasado marca al protagonista?')).toBeInTheDocument()

    const textareas = screen.getAllByRole('textbox')
    fireEvent.change(textareas[1], { target: { value: 'Perdió a su familia' } })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        structure: expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({ id: 'inicio', answers: { 'q-1': 'Perdió a su familia' } }),
          ]),
        }),
      }),
    )
  })

  it('permite cambiar de plantilla', async () => {
    render(
      <ControlledGuided
        initialMeta={{
          structure: {
            templateId: 't-1',
            sections: [{ id: 'inicio', content: '', answers: {} }],
          },
        }}
      />,
    )

    fireEvent.click(await screen.findByText('storySetup.templateChange'))
    expect(screen.getByText('storySetup.templateQuestion')).toBeInTheDocument()
    expect(screen.getByText('Inicio y Final')).toBeInTheDocument()
  })

  it('muestra error con reintento si falla la carga', async () => {
    storyBankApiMock.listTemplates.mockRejectedValue(new Error('Network'))
    renderGuided()

    expect(await screen.findByText('Network')).toBeInTheDocument()
    fireEvent.click(screen.getByText('storySetup.retry'))
    await waitFor(() => {
      expect(storyBankApiMock.listTemplates).toHaveBeenCalledTimes(2)
    })
  })
})
