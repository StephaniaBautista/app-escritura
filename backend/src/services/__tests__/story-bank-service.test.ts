import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    storyQuestion: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    storyTemplate: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

import {
  storyBankService,
  validateSections,
  STANDARD_SECTION_IDS,
  type TemplateSection,
  type StoryTemplateRow,
  type StoryQuestionRow,
} from '../story-bank-service.js'

const question: StoryQuestionRow = {
  id: 'q-1',
  text: '¿Qué secreto guarda el protagonista?',
  textEn: 'What secret does the protagonist keep?',
  isDefault: true,
  createdAt: new Date(),
}

const templateRow = (overrides: Partial<StoryTemplateRow> = {}): StoryTemplateRow => ({
  id: 't-1',
  name: 'Inicio y Final',
  nameEn: 'Beginning and Ending',
  description: null,
  descriptionEn: null,
  sections: [
    { id: 'inicio', questionIds: ['q-1'] },
    { id: 'final', questionIds: [] },
  ],
  isDefault: true,
  createdAt: new Date(),
  ...overrides,
})

describe('validateSections', () => {
  it('acepta secciones estándar sin título', () => {
    const sections = validateSections([
      { id: 'inicio', questionIds: ['q-1'] },
      { id: 'final', questionIds: [] },
    ])
    expect(sections).toHaveLength(2)
    expect(sections[0].title).toBeUndefined()
  })

  it('exige título en secciones personalizadas', () => {
    expect(() => validateSections([{ id: 'epilogo', questionIds: [] }])).toThrow('título')
  })

  it('rechaza ids duplicados y demasiadas secciones', () => {
    expect(() =>
      validateSections([
        { id: 'inicio', questionIds: [] },
        { id: 'inicio', questionIds: [] },
      ]),
    ).toThrow('duplicada')

    const many = Array.from({ length: 13 }, (_, i) => ({ id: `s-${i}`, title: `Sección ${i}`, questionIds: [] }))
    expect(() => validateSections(many)).toThrow('más de 12')
  })

  it('filtra questionIds no string y limpia títulos largos', () => {
    const sections = validateSections([
      { id: 'epilogo', title: 'x'.repeat(200), questionIds: ['q-1', 42, 'q-2'] },
    ])
    expect(sections[0].title).toHaveLength(100)
    expect(sections[0].questionIds).toEqual(['q-1', 'q-2'])
  })

  it('valida ids de sección estándar', () => {
    expect(STANDARD_SECTION_IDS).toContain('inicio')
    expect(STANDARD_SECTION_IDS).toContain('final')
  })
})

describe('storyBankService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storyBankService.invalidate()
  })

  describe('preguntas', () => {
    it('listQuestions: devuelve todas las preguntas', async () => {
      prismaMock.storyQuestion.findMany.mockResolvedValue([question])

      const result = await storyBankService.listQuestions()

      expect(prismaMock.storyQuestion.findMany).toHaveBeenCalledWith({
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      })
      expect(result).toHaveLength(1)
    })

    it('listQuestions: usa cache tras la primera llamada', async () => {
      prismaMock.storyQuestion.findMany.mockResolvedValue([question])

      await storyBankService.listQuestions()
      await storyBankService.listQuestions()

      expect(prismaMock.storyQuestion.findMany).toHaveBeenCalledTimes(1)
    })

    it('getQuestionsByIds: devuelve solo las ids pedidas y vacío sin ids', async () => {
      prismaMock.storyQuestion.findMany.mockResolvedValue([question])

      await storyBankService.getQuestionsByIds(['q-1'])
      expect(prismaMock.storyQuestion.findMany).toHaveBeenCalledWith({ where: { id: { in: ['q-1'] } } })

      const empty = await storyBankService.getQuestionsByIds([])
      expect(empty).toEqual([])
    })

    it('createQuestion: crea pregunta no default y limpia cache', async () => {
      prismaMock.storyQuestion.create.mockResolvedValue({ ...question, id: 'q-2', isDefault: false })

      const created = await storyBankService.createQuestion('¿Nueva pregunta?', '  ')

      expect(prismaMock.storyQuestion.create).toHaveBeenCalledWith({
        data: { text: '¿Nueva pregunta?', textEn: null, isDefault: false },
      })
      expect(created.isDefault).toBe(false)
    })

    it('updateQuestion: actualiza texto y devuelve null si no existe', async () => {
      prismaMock.storyQuestion.findUnique.mockResolvedValue(question)
      prismaMock.storyQuestion.update.mockResolvedValue({ ...question, text: 'Nuevo texto' })

      const updated = await storyBankService.updateQuestion('q-1', { text: 'Nuevo texto' })
      expect(updated?.text).toBe('Nuevo texto')

      prismaMock.storyQuestion.findUnique.mockResolvedValue(null)
      const missing = await storyBankService.updateQuestion('nope', { text: 'x' })
      expect(missing).toBeNull()
    })

    it('deleteQuestion: borra también preguntas de sistema (defaults)', async () => {
      prismaMock.storyQuestion.findUnique.mockResolvedValue(question)
      prismaMock.storyQuestion.delete.mockResolvedValue({} as never)

      const deleted = await storyBankService.deleteQuestion('q-1')
      expect(deleted).toBe(true)
      expect(prismaMock.storyQuestion.delete).toHaveBeenCalledWith({ where: { id: 'q-1' } })
    })

    it('deleteQuestion: devuelve false si no existe', async () => {
      prismaMock.storyQuestion.findUnique.mockResolvedValue(null)

      expect(await storyBankService.deleteQuestion('nope')).toBe(false)
      expect(prismaMock.storyQuestion.delete).not.toHaveBeenCalled()
    })
  })

  describe('plantillas', () => {
    it('listTemplates: normaliza sections y cachea', async () => {
      prismaMock.storyTemplate.findMany.mockResolvedValue([templateRow()])

      const result = await storyBankService.listTemplates()

      expect(result[0].sections).toEqual(templateRow().sections)
      expect(prismaMock.storyTemplate.findMany).toHaveBeenCalledTimes(1)

      await storyBankService.listTemplates()
      expect(prismaMock.storyTemplate.findMany).toHaveBeenCalledTimes(1)
    })

    it('getTemplate: devuelve null si no existe', async () => {
      prismaMock.storyTemplate.findUnique.mockResolvedValue(null)
      expect(await storyBankService.getTemplate('nope')).toBeNull()
    })

    it('createTemplate: persiste sections como objeto', async () => {
      const sections: TemplateSection[] = [
        { id: 'inicio', questionIds: ['q-1'] },
        { id: 'epilogo', title: 'Epílogo', questionIds: [] },
      ]
      prismaMock.storyTemplate.create.mockImplementation(async ({ data }) => ({
        ...templateRow(),
        name: data.name,
        nameEn: data.nameEn,
        sections: data.sections as TemplateSection[],
        isDefault: false,
      }))

      const created = await storyBankService.createTemplate({ name: 'Custom', sections })

      expect(prismaMock.storyTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Custom', isDefault: false, sections }),
      })
      expect(created.sections).toHaveLength(2)
    })

    it('updateTemplate: rechaza sections inválidas y devuelve null si no existe', async () => {
      prismaMock.storyTemplate.findUnique.mockResolvedValue(null)

      const missing = await storyBankService.updateTemplate('nope', { name: 'x' })
      expect(missing).toBeNull()

      prismaMock.storyTemplate.findUnique.mockResolvedValue(templateRow())
      expect(() =>
        storyBankService.updateTemplate('t-1', { sections: [{ id: 'custom', questionIds: [] }] as TemplateSection[] }),
      ).rejects.toThrow()
    })

    it('deleteTemplate: borra también plantillas de sistema (defaults)', async () => {
      prismaMock.storyTemplate.findUnique.mockResolvedValue(templateRow())
      prismaMock.storyTemplate.delete.mockResolvedValue({} as never)

      expect(await storyBankService.deleteTemplate('t-1')).toBe(true)
      expect(prismaMock.storyTemplate.delete).toHaveBeenCalledWith({ where: { id: 't-1' } })
    })

    it('deleteTemplate: devuelve false si no existe', async () => {
      prismaMock.storyTemplate.findUnique.mockResolvedValue(null)

      expect(await storyBankService.deleteTemplate('nope')).toBe(false)
      expect(prismaMock.storyTemplate.delete).not.toHaveBeenCalled()
    })
  })

  describe('seedDefaults', () => {
    it('siembra preguntas generales y plantillas solo cuando las tablas están vacías', async () => {
      prismaMock.storyQuestion.count.mockResolvedValue(0)
      prismaMock.storyQuestion.create.mockResolvedValue({ ...question, isDefault: true })
      prismaMock.storyQuestion.findMany.mockResolvedValue([
        { ...question, text: '¿Qué evento desencadena la historia?' },
        { ...question, id: 'q-2', text: '¿Qué conflicto central mueve la historia?' },
        { ...question, id: 'q-3', text: '¿Qué mundo o entorno rodea la historia?' },
        { ...question, id: 'q-4', text: '¿Quién se opone a los objetivos de los personajes?' },
        { ...question, id: 'q-5', text: '¿Qué secretos del pasado afectan a la trama?' },
        { ...question, id: 'q-6', text: '¿Cómo cambia el mundo al final de la historia?' },
      ])
      prismaMock.storyTemplate.count.mockResolvedValue(0)
      prismaMock.storyTemplate.create.mockResolvedValue(templateRow())

      const result = await storyBankService.seedDefaults()

      expect(result.questions).toBe(6)
      expect(result.templates).toBe(4)
      expect(prismaMock.storyQuestion.create).toHaveBeenCalledTimes(6)
      expect(prismaMock.storyTemplate.create).toHaveBeenCalledTimes(4)
    })

    it('no siembra nada si ya existen datos (el admin puede borrar defaults sin que vuelvan)', async () => {
      prismaMock.storyQuestion.count.mockResolvedValue(3)
      prismaMock.storyQuestion.findMany.mockResolvedValue([])
      prismaMock.storyTemplate.count.mockResolvedValue(2)

      const result = await storyBankService.seedDefaults()

      expect(result.questions).toBe(0)
      expect(result.templates).toBe(0)
      expect(prismaMock.storyQuestion.create).not.toHaveBeenCalled()
      expect(prismaMock.storyTemplate.create).not.toHaveBeenCalled()
    })

    it('las preguntas sembradas son generales, no centradas en el protagonista', async () => {
      prismaMock.storyQuestion.count.mockResolvedValue(0)
      prismaMock.storyQuestion.create.mockResolvedValue({ ...question, isDefault: true })
      prismaMock.storyQuestion.findMany.mockResolvedValue([])
      prismaMock.storyTemplate.count.mockResolvedValue(0)
      prismaMock.storyTemplate.create.mockResolvedValue(templateRow())

      await storyBankService.seedDefaults()

      const texts = prismaMock.storyQuestion.create.mock.calls.map(([args]) => args.data.text)
      expect(texts.some((t: string) => t.includes('protagonista'))).toBe(false)
      expect(texts).toContain('¿Qué conflicto central mueve la historia?')
    })
  })
})
