import { prisma } from '../lib/prisma.js'

export type OptionType = 'rating' | 'storyType' | 'category' | 'narrator' | 'ending' | 'fandom' | 'tag' | 'problem' | 'ship' | 'character'

export interface StoryOptionRow {
  id: string
  type: string
  value: string
  label: string
  isDefault: boolean
  createdAt: Date
}

export const SIMILARITY_THRESHOLD = 0.8

export function normalizeOptionValue(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ')
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const curr = [i]
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = curr
  }
  return prev[n]
}

export function optionSimilarity(a: string, b: string): number {
  const na = normalizeOptionValue(a)
  const nb = normalizeOptionValue(b)
  if (na === nb) return 1
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 1
  return 1 - levenshteinDistance(na, nb) / maxLen
}

export const optionsService = {
  async list(type: OptionType): Promise<StoryOptionRow[]> {
    return prisma.storyOption.findMany({
      where: { type },
      orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
    })
  },

  async listAll(): Promise<StoryOptionRow[]> {
    return prisma.storyOption.findMany({
      orderBy: [{ type: 'asc' }, { isDefault: 'desc' }, { label: 'asc' }],
    })
  },

  async create(type: OptionType, value: string, label: string): Promise<StoryOptionRow> {
    const existing = await prisma.storyOption.findFirst({
      where: { type, value: { equals: value, mode: 'insensitive' } },
    })
    if (existing) return existing

    return prisma.storyOption.create({
      data: { type, value, label, isDefault: false },
    })
  },

  async delete(id: string): Promise<boolean> {
    const option = await prisma.storyOption.findFirst({
      where: { id, isDefault: false },
    })
    if (!option) return false

    await prisma.storyOption.delete({ where: { id } })
    return true
  },

  async groups(type: OptionType): Promise<StoryOptionRow[][]> {
    const options = await this.list(type)
    const groups: StoryOptionRow[][] = []
    const used = new Set<string>()

    for (const opt of options) {
      if (used.has(opt.id)) continue
      const group = [opt]
      used.add(opt.id)
      for (const other of options) {
        if (used.has(other.id)) continue
        if (optionSimilarity(opt.value, other.value) >= SIMILARITY_THRESHOLD) {
          group.push(other)
          used.add(other.id)
        }
      }
      groups.push(group)
    }

    return groups
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
        where: { type: opt.type, value: opt.value },
      })
      if (!exists) {
        await prisma.storyOption.create({
          data: { ...opt, isDefault: true },
        })
        created++
      }
    }
    return created
  },
}
