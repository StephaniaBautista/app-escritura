import { prisma } from '../lib/prisma.js'
import type { Prisma } from '@generated/client'
import { MemoryCache } from '../lib/cache.js'

export interface StoryQuestionRow {
  id: string
  text: string
  textEn: string | null
  isDefault: boolean
  createdAt: Date
}

export interface TemplateSection {
  id: string // 'inicio' | 'desarrollo' | 'climax' | 'final' | custom slug
  title?: string // label es para secciones custom; vacío en las estándar (se resuelven por i18n)
  titleEn?: string
  questionIds: string[]
}

export interface StoryTemplateRow {
  id: string
  name: string
  nameEn: string | null
  description: string | null
  descriptionEn: string | null
  sections: TemplateSection[]
  isDefault: boolean
  createdAt: Date
}

export interface TemplateInput {
  name: string
  nameEn?: string | null
  description?: string | null
  descriptionEn?: string | null
  sections: TemplateSection[]
}

export const STANDARD_SECTION_IDS = ['inicio', 'desarrollo', 'climax', 'final'] as const

function normalizeSections(raw: unknown): TemplateSection[] {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
  return validateSections(parsed)
}

const BANK_CACHE_TTL_MS = 5 * 60 * 1000
const bankCache = new MemoryCache<unknown>({ defaultTtlMs: BANK_CACHE_TTL_MS })

const MAX_SECTIONS = 12
const MAX_SECTION_TITLE = 100
const MAX_QUESTION_TEXT = 500

export function validateSections(sections: unknown): TemplateSection[] {
  if (!Array.isArray(sections)) {
    throw new Error('sections debe ser un array')
  }
  if (sections.length > MAX_SECTIONS) {
    throw new Error(`Una plantilla no puede tener más de ${MAX_SECTIONS} secciones`)
  }
  const seen = new Set<string>()
  const clean: TemplateSection[] = []
  for (const raw of sections) {
    if (typeof raw !== 'object' || raw === null) {
      throw new Error('Sección inválida')
    }
    const section = raw as Record<string, unknown>
    const id = typeof section.id === 'string' ? section.id.trim() : ''
    if (!id) throw new Error('Cada sección necesita un id')
    if (seen.has(id)) throw new Error(`Sección duplicada: ${id}`)
    seen.add(id)

    const isStandard = (STANDARD_SECTION_IDS as readonly string[]).includes(id)
    const title = typeof section.title === 'string' ? section.title.trim().slice(0, MAX_SECTION_TITLE) : ''
    if (!isStandard && !title) {
      throw new Error('Las secciones personalizadas necesitan un título')
    }

    clean.push({
      id,
      title: isStandard ? undefined : title,
      titleEn: typeof section.titleEn === 'string' && section.titleEn.trim() ? section.titleEn.trim().slice(0, MAX_SECTION_TITLE) : undefined,
      questionIds: Array.isArray(section.questionIds)
        ? section.questionIds.filter((q): q is string => typeof q === 'string')
        : [],
    })
  }
  return clean
}

export const storyBankService = {
  async listQuestions(): Promise<StoryQuestionRow[]> {
    const cached = bankCache.get('questions')
    if (cached) return cached as StoryQuestionRow[]

    const result = await prisma.storyQuestion.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
    bankCache.set('questions', result)
    return result
  },

  async getQuestionsByIds(ids: string[]): Promise<StoryQuestionRow[]> {
    if (ids.length === 0) return []
    return prisma.storyQuestion.findMany({ where: { id: { in: ids } } })
  },

  async createQuestion(text: string, textEn?: string): Promise<StoryQuestionRow> {
    const question = await prisma.storyQuestion.create({
      data: { text, textEn: textEn?.trim() || null, isDefault: false },
    })
    bankCache.clear()
    return question
  },

  async updateQuestion(
    id: string,
    input: { text?: string; textEn?: string | null },
  ): Promise<StoryQuestionRow | null> {
    const existing = await prisma.storyQuestion.findUnique({ where: { id } })
    if (!existing) return null

    const updated = await prisma.storyQuestion.update({
      where: { id },
      data: {
        ...(input.text !== undefined ? { text: input.text } : {}),
        ...(input.textEn !== undefined ? { textEn: input.textEn?.trim() || null } : {}),
      },
    })
    bankCache.clear()
    return updated
  },

  async deleteQuestion(id: string): Promise<boolean> {
    const question = await prisma.storyQuestion.findUnique({ where: { id } })
    if (!question) return false

    await prisma.storyQuestion.delete({ where: { id } })
    bankCache.clear()
    return true
  },

  async listTemplates(): Promise<StoryTemplateRow[]> {
    const cached = bankCache.get('templates')
    if (cached) return cached as StoryTemplateRow[]

    const result = await prisma.storyTemplate.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
    const normalized = result.map((t) => ({ ...t, sections: normalizeSections(t.sections) }))
    bankCache.set('templates', normalized)
    return normalized
  },

  async getTemplate(id: string): Promise<StoryTemplateRow | null> {
    const template = await prisma.storyTemplate.findUnique({ where: { id } })
    if (!template) return null
    return { ...template, sections: normalizeSections(template.sections) }
  },

  async createTemplate(input: TemplateInput): Promise<StoryTemplateRow> {
    const sections = validateSections(input.sections)
    const template = await prisma.storyTemplate.create({
      data: {
        name: input.name,
        nameEn: input.nameEn?.trim() || null,
        description: input.description?.trim() || null,
        descriptionEn: input.descriptionEn?.trim() || null,
        sections: sections as unknown as Prisma.InputJsonValue,
        isDefault: false,
      },
    })
    bankCache.clear()
    return { ...template, sections: normalizeSections(template.sections) }
  },

  async updateTemplate(id: string, input: Partial<TemplateInput>): Promise<StoryTemplateRow | null> {
    const existing = await prisma.storyTemplate.findUnique({ where: { id } })
    if (!existing) return null

    const data: Record<string, unknown> = {}
    if (input.name !== undefined) data.name = input.name
    if (input.nameEn !== undefined) data.nameEn = input.nameEn?.trim() || null
    if (input.description !== undefined) data.description = input.description?.trim() || null
    if (input.descriptionEn !== undefined) data.descriptionEn = input.descriptionEn?.trim() || null
    if (input.sections !== undefined) data.sections = validateSections(input.sections) as unknown as Prisma.InputJsonValue

    const updated = await prisma.storyTemplate.update({ where: { id }, data })
    bankCache.clear()
    return { ...updated, sections: normalizeSections(updated.sections) }
  },

  async deleteTemplate(id: string): Promise<boolean> {
    const template = await prisma.storyTemplate.findUnique({ where: { id } })
    if (!template) return false

    await prisma.storyTemplate.delete({ where: { id } })
    bankCache.clear()
    return true
  },

  invalidate(): void {
    bankCache.clear()
  },

  async seedDefaults(): Promise<{ questions: number; templates: number }> {
    // Los defaults se siembran solo en el primer arranque (tabla vacía): el admin puede
    // editarlos o borrarlos y los cambios persisten entre reinicios.
    const seedQuestions: { text: string; textEn: string }[] = [
      { text: '¿Qué evento desencadena la historia?', textEn: 'What event triggers the story?' },
      { text: '¿Qué conflicto central mueve la historia?', textEn: 'What central conflict drives the story?' },
      { text: '¿Qué mundo o entorno rodea la historia?', textEn: 'What world or setting surrounds the story?' },
      { text: '¿Quién se opone a los objetivos de los personajes?', textEn: 'Who opposes the characters\' goals?' },
      { text: '¿Qué secretos del pasado afectan a la trama?', textEn: 'What secrets from the past affect the plot?' },
      { text: '¿Cómo cambia el mundo al final de la historia?', textEn: 'How does the world change by the end of the story?' },
    ]

    const questionCount = await prisma.storyQuestion.count()
    let questions = 0
    if (questionCount === 0) {
      for (const q of seedQuestions) {
        await prisma.storyQuestion.create({ data: { ...q, isDefault: true } })
        questions++
      }
    }

    const all = await prisma.storyQuestion.findMany({ orderBy: { createdAt: 'asc' } })
    const byText = new Map(all.map((q) => [q.text, q.id]))
    const id = (text: string): string => byText.get(text) ?? ''

    const seedTemplates: {
      name: string
      nameEn: string
      description: string
      descriptionEn: string
      sections: TemplateSection[]
    }[] = [
      {
        name: 'Inicio y Final',
        nameEn: 'Beginning and Ending',
        description: 'La estructura mínima: plantea el inicio y el cierre de la historia.',
        descriptionEn: 'The minimal structure: set up the beginning and the ending of the story.',
        sections: [
          { id: 'inicio', questionIds: [id('¿Qué evento desencadena la historia?'), id('¿Qué secretos del pasado afectan a la trama?')] },
          { id: 'final', questionIds: [id('¿Cómo cambia el mundo al final de la historia?')] },
        ],
      },
      {
        name: 'Inicio y Desarrollo',
        nameEn: 'Beginning and Development',
        description: 'Plantea el inicio y desarrolla la trama sin un cierre definido.',
        descriptionEn: 'Set up the beginning and develop the plot without a defined ending.',
        sections: [
          { id: 'inicio', questionIds: [id('¿Qué evento desencadena la historia?')] },
          { id: 'desarrollo', questionIds: [id('¿Qué conflicto central mueve la historia?'), id('¿Quién se opone a los objetivos de los personajes?')] },
        ],
      },
      {
        name: 'Inicio, Desarrollo y Final',
        nameEn: 'Beginning, Development and Ending',
        description: 'Una historia completa sin clímax explícito: inicio, desarrollo y cierre.',
        descriptionEn: 'A complete story without an explicit climax: beginning, development and ending.',
        sections: [
          { id: 'inicio', questionIds: [id('¿Qué mundo o entorno rodea la historia?')] },
          { id: 'desarrollo', questionIds: [id('¿Qué conflicto central mueve la historia?'), id('¿Qué secretos del pasado afectan a la trama?')] },
          { id: 'final', questionIds: [id('¿Cómo cambia el mundo al final de la historia?')] },
        ],
      },
      {
        name: 'Historia completa',
        nameEn: 'Full Story',
        description: 'La estructura clásica en cuatro partes: inicio, desarrollo, clímax y final.',
        descriptionEn: 'The classic four-part structure: beginning, development, climax and ending.',
        sections: [
          { id: 'inicio', questionIds: [id('¿Qué evento desencadena la historia?'), id('¿Qué mundo o entorno rodea la historia?')] },
          { id: 'desarrollo', questionIds: [id('¿Qué conflicto central mueve la historia?'), id('¿Quién se opone a los objetivos de los personajes?')] },
          { id: 'climax', questionIds: [id('¿Qué secretos del pasado afectan a la trama?')] },
          { id: 'final', questionIds: [id('¿Cómo cambia el mundo al final de la historia?')] },
        ],
      },
    ]

    const templateCount = await prisma.storyTemplate.count()
    let templates = 0
    if (templateCount === 0) {
      for (const t of seedTemplates) {
        await prisma.storyTemplate.create({
          data: {
            name: t.name,
            nameEn: t.nameEn,
            description: t.description,
            descriptionEn: t.descriptionEn,
            sections: t.sections as unknown as Prisma.InputJsonValue,
            isDefault: true,
          },
        })
        templates++
      }
    }

    if (questions > 0 || templates > 0) bankCache.clear()
    return { questions, templates }
  },
}
