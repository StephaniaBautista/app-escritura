import { prisma } from '../lib/prisma.js'
import { MemoryCache } from '../lib/cache.js'

export interface StorySectionRow {
  id: string
  sortOrder: number
  createdAt: Date
}

const CACHE_TTL_MS = 5 * 60 * 1000
const sectionCache = new MemoryCache<unknown>({ defaultTtlMs: CACHE_TTL_MS })

export const storySectionService = {
  async list(): Promise<StorySectionRow[]> {
    const cached = sectionCache.get('all')
    if (cached) return cached as StorySectionRow[]

    const result = await prisma.storySection.findMany({
      orderBy: [{ sortOrder: 'asc' }],
    })
    sectionCache.set('all', result)
    return result
  },

  async isStandard(id: string): Promise<boolean> {
    const sections = await this.list()
    return sections.some((s) => s.id === id)
  },

  invalidate(): void {
    sectionCache.clear()
  },

  async seedDefaults(): Promise<number> {
    const defaults: { id: string; sortOrder: number }[] = [
      { id: 'inicio', sortOrder: 1 },
      { id: 'desarrollo', sortOrder: 2 },
      { id: 'climax', sortOrder: 3 },
      { id: 'final', sortOrder: 4 },
    ]

    let created = 0
    for (const section of defaults) {
      const exists = await prisma.storySection.findUnique({ where: { id: section.id } })
      if (!exists) {
        await prisma.storySection.create({ data: section })
        created++
      }
    }
    if (created > 0) sectionCache.clear()
    return created
  },
}
