import { prisma } from '../lib/prisma.js'
import { MemoryCache } from '../lib/cache.js'

export type OptionType = 'rating' | 'storyType' | 'category' | 'narrator' | 'ending' | 'fandom' | 'tag' | 'problem' | 'ship' | 'character'

export const FANDOM_CHILD_TYPES = ['ship', 'character'] as const
export type FandomChildType = (typeof FANDOM_CHILD_TYPES)[number]

export interface StoryOptionRow {
  id: string
  type: string
  value: string
  label: string
  fandoms: string[]
  isDefault: boolean
  createdAt: Date
}

export interface FandomNode {
  id: string
  value: string
  label: string
  isDefault: boolean
  counts: Record<FandomChildType, number>
}

export interface FandomChildren {
  ship: StoryOptionRow[]
  character: StoryOptionRow[]
}

export interface FandomTree {
  fandoms: FandomNode[]
  children: Record<string, FandomChildren>
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

const OPTIONS_CACHE_TTL_MS = 5 * 60 * 1000
const optionsCache = new MemoryCache<unknown>({ defaultTtlMs: OPTIONS_CACHE_TTL_MS })

export const optionsService = {
  async list(type: OptionType, opts?: { fandoms?: string[] }): Promise<StoryOptionRow[]> {
    const key = `list:${type}:${opts?.fandoms?.join(',') ?? ''}`
    const cached = optionsCache.get(key)
    if (cached) return cached as StoryOptionRow[]

    const where: { type: string; fandoms?: object } = { type }
    const scoped = type === 'ship' || type === 'character'
    if (opts?.fandoms && scoped) {
      where.fandoms = opts.fandoms.length > 0
        ? { hasSome: opts.fandoms }
        : { isEmpty: true }
    }
    const result = await prisma.storyOption.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
    })
    optionsCache.set(key, result)
    return result
  },

  async listAll(): Promise<StoryOptionRow[]> {
    const cached = optionsCache.get('all')
    if (cached) return cached as StoryOptionRow[]

    const result = await prisma.storyOption.findMany({
      orderBy: [{ type: 'asc' }, { isDefault: 'desc' }, { label: 'asc' }],
    })
    optionsCache.set('all', result)
    return result
  },

  async create(type: OptionType, value: string, label: string, fandoms?: string[]): Promise<StoryOptionRow> {
    const existing = await prisma.storyOption.findFirst({
      where: { type, value: { equals: value, mode: 'insensitive' } },
    })
    if (existing) return existing

    const created = await prisma.storyOption.create({
      data: { type, value, label, fandoms: fandoms ?? [], isDefault: false },
    })
    optionsCache.clear()
    return created
  },

  async delete(id: string): Promise<boolean> {
    const option = await prisma.storyOption.findFirst({
      where: { id, isDefault: false },
    })
    if (!option) return false

    await prisma.storyOption.delete({ where: { id } })
    optionsCache.clear()
    return true
  },

  invalidate(): void {
    optionsCache.clear()
  },

  async findById(id: string): Promise<StoryOptionRow | null> {
    return prisma.storyOption.findUnique({ where: { id } })
  },

  async listByFandom(): Promise<FandomTree> {
    const cached = optionsCache.get('fandomTree')
    if (cached) return cached as FandomTree

    const fandoms = await prisma.storyOption.findMany({
      where: { type: 'fandom' },
      orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
    })

    const children = await prisma.storyOption.findMany({
      where: { type: { in: [...FANDOM_CHILD_TYPES] }, fandoms: { isEmpty: false } },
      orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
    })

    const childrenMap: Record<string, FandomChildren> = {}
    for (const f of fandoms) {
      childrenMap[f.value] = { ship: [], character: [] }
    }

    for (const child of children) {
      if (!FANDOM_CHILD_TYPES.includes(child.type as FandomChildType)) continue
      for (const fandomValue of child.fandoms) {
        const bucket = childrenMap[fandomValue]
        if (!bucket) continue
        bucket[child.type as FandomChildType].push(child)
      }
    }

    const nodes: FandomNode[] = fandoms.map((f) => ({
      id: f.id,
      value: f.value,
      label: f.label,
      isDefault: f.isDefault,
      counts: {
        ship: childrenMap[f.value]?.ship.length ?? 0,
        character: childrenMap[f.value]?.character.length ?? 0,
      },
    }))

    const tree: FandomTree = { fandoms: nodes, children: childrenMap }
    optionsCache.set('fandomTree', tree)
    return tree
  },

  async hasFandomChildren(fandomValue: string): Promise<boolean> {
    const child = await prisma.storyOption.findFirst({
      where: { type: { in: [...FANDOM_CHILD_TYPES] }, fandoms: { has: fandomValue } },
    })
    return child !== null
  },

  async moveFandom(
    id: string,
    fandomValue: string,
  ): Promise<{ ok: true } | { ok: false; reason: 'not-found' | 'is-default' | 'invalid-type' | 'invalid-fandom' }> {
    const option = await prisma.storyOption.findUnique({ where: { id } })
    if (!option) return { ok: false, reason: 'not-found' }
    if (option.isDefault) return { ok: false, reason: 'is-default' }
    if (!FANDOM_CHILD_TYPES.includes(option.type as FandomChildType)) {
      return { ok: false, reason: 'invalid-type' }
    }

    const fandom = await prisma.storyOption.findFirst({
      where: { type: 'fandom', value: fandomValue },
    })
    if (!fandom) return { ok: false, reason: 'invalid-fandom' }

    await prisma.storyOption.update({ where: { id }, data: { fandoms: [fandomValue] } })
    optionsCache.clear()
    return { ok: true }
  },

  async groups(type: OptionType): Promise<StoryOptionRow[][]> {
    const key = `groups:${type}`
    const cached = optionsCache.get(key)
    if (cached) return cached as StoryOptionRow[][]

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

    optionsCache.set(key, groups)
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
    if (created > 0) optionsCache.clear()
    return created
  },
}
