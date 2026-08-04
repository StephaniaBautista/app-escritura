import { prisma } from '../lib/prisma.js'

export type OptionType = 'rating' | 'storyType' | 'category' | 'narrator' | 'ending' | 'fandom' | 'tag' | 'problem'

export interface StoryOptionRow {
  id: string
  userId: string | null
  type: string
  value: string
  label: string
  isDefault: boolean
  createdAt: Date
}

export const optionsService = {
  async list(type: OptionType, userId: string): Promise<StoryOptionRow[]> {
    return prisma.storyOption.findMany({
      where: {
        type,
        OR: [{ userId: null }, { userId }],
      },
      orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
    })
  },

  async listAll(userId: string): Promise<StoryOptionRow[]> {
    return prisma.storyOption.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
      },
      orderBy: [{ type: 'asc' }, { isDefault: 'desc' }, { label: 'asc' }],
    })
  },

  async create(userId: string, type: OptionType, value: string, label: string): Promise<StoryOptionRow | null> {
    const existing = await prisma.storyOption.findFirst({
      where: { userId, type, value },
    })
    if (existing) return existing

    return prisma.storyOption.create({
      data: { userId, type, value, label, isDefault: false },
    })
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const option = await prisma.storyOption.findFirst({
      where: { id, userId, isDefault: false },
    })
    if (!option) return false

    await prisma.storyOption.delete({ where: { id } })
    return true
  },

  async seedDefaults(): Promise<number> {
    const defaults: { type: OptionType; value: string; label: string }[] = [
      { type: 'rating', value: 'general', label: 'General' },
      { type: 'rating', value: 'teen', label: 'Teen' },
      { type: 'rating', value: 'mature', label: 'Mature' },
      { type: 'rating', value: 'explicit', label: 'Explicit' },
      { type: 'storyType', value: 'Romance', label: 'Romance' },
      { type: 'storyType', value: 'Ciencia Ficción', label: 'Ciencia Ficción' },
      { type: 'storyType', value: 'Drama', label: 'Drama' },
      { type: 'storyType', value: 'Misterio', label: 'Misterio' },
      { type: 'storyType', value: 'Fantasía', label: 'Fantasía' },
      { type: 'storyType', value: 'Terror', label: 'Terror' },
      { type: 'storyType', value: 'Comedia', label: 'Comedia' },
      { type: 'storyType', value: 'Acción', label: 'Acción' },
      { type: 'storyType', value: 'Thriller', label: 'Thriller' },
      { type: 'storyType', value: 'Histórico', label: 'Histórico' },
      { type: 'storyType', value: 'Costumbrista', label: 'Costumbrista' },
      { type: 'storyType', value: 'Otro', label: 'Otro' },
      { type: 'category', value: 'F/F', label: 'F/F' },
      { type: 'category', value: 'M/M', label: 'M/M' },
      { type: 'category', value: 'F/M', label: 'F/M' },
      { type: 'category', value: 'Multi', label: 'Multi' },
      { type: 'category', value: 'Other', label: 'Other' },
      { type: 'narrator', value: 'Primera persona', label: 'Primera persona' },
      { type: 'narrator', value: 'Segunda persona', label: 'Segunda persona' },
      { type: 'narrator', value: 'Tercera persona limitada', label: 'Tercera persona limitada' },
      { type: 'narrator', value: 'Tercera persona omnisciente', label: 'Tercera persona omnisciente' },
      { type: 'ending', value: 'Feliz', label: 'Feliz' },
      { type: 'ending', value: 'Trágico', label: 'Trágico' },
      { type: 'ending', value: 'Agridulce', label: 'Agridulce' },
      { type: 'ending', value: 'Abierto', label: 'Abierto' },
    ]

    let created = 0
    for (const opt of defaults) {
      const exists = await prisma.storyOption.findFirst({
        where: { userId: null, type: opt.type, value: opt.value },
      })
      if (!exists) {
        await prisma.storyOption.create({
          data: { ...opt, userId: null, isDefault: true },
        })
        created++
      }
    }
    return created
  },
}
