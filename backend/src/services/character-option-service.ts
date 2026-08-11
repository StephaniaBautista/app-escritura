import { prisma } from '../lib/prisma.js'
import { MemoryCache } from '../lib/cache.js'

export type CharacterOptionType = 'gender' | 'orientation' | 'maritalStatus' | 'role'

export interface CharacterOptionRow {
  id: string
  type: string
  value: string
  label: string
  labelEn: string | null
  sortOrder: number
  isDefault: boolean
  createdAt: Date
}

export interface CharacterOptionGroup {
  type: CharacterOptionType
  options: CharacterOptionRow[]
}

export const CHARACTER_OPTION_TYPES: CharacterOptionType[] = ['gender', 'orientation', 'maritalStatus', 'role']

const OPTIONS_CACHE_TTL_MS = 5 * 60 * 1000
const optionsCache = new MemoryCache<unknown>({ defaultTtlMs: OPTIONS_CACHE_TTL_MS })

export const characterOptionService = {
  async listByType(type: CharacterOptionType): Promise<CharacterOptionRow[]> {
    const cached = optionsCache.get(`type:${type}`)
    if (cached) return cached as CharacterOptionRow[]

    const result = await prisma.characterOption.findMany({
      where: { type },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    })
    optionsCache.set(`type:${type}`, result)
    return result
  },

  async listGrouped(): Promise<CharacterOptionGroup[]> {
    const cached = optionsCache.get('grouped')
    if (cached) return cached as CharacterOptionGroup[]

    const rows = await prisma.characterOption.findMany({
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    })
    const grouped = CHARACTER_OPTION_TYPES.map((type) => ({
      type,
      options: rows.filter((r) => r.type === type),
    }))
    optionsCache.set('grouped', grouped)
    return grouped
  },

  invalidate(): void {
    optionsCache.clear()
  },

  async seedDefaults(): Promise<number> {
    const defaults: { type: CharacterOptionType; value: string; label: string; labelEn: string }[] = [
      { type: 'gender', value: 'Femenino', label: 'Femenino', labelEn: 'Female' },
      { type: 'gender', value: 'Masculino', label: 'Masculino', labelEn: 'Male' },
      { type: 'gender', value: 'No binario', label: 'No binario', labelEn: 'Non-binary' },
      { type: 'gender', value: 'Fluido', label: 'Fluido', labelEn: 'Genderfluid' },
      { type: 'orientation', value: 'Heterosexual', label: 'Heterosexual', labelEn: 'Heterosexual' },
      { type: 'orientation', value: 'Homosexual', label: 'Homosexual', labelEn: 'Homosexual' },
      { type: 'orientation', value: 'Bisexual', label: 'Bisexual', labelEn: 'Bisexual' },
      { type: 'orientation', value: 'Pansexual', label: 'Pansexual', labelEn: 'Pansexual' },
      { type: 'orientation', value: 'Asexual', label: 'Asexual', labelEn: 'Asexual' },
      { type: 'maritalStatus', value: 'Soltero/a', label: 'Soltero/a', labelEn: 'Single' },
      { type: 'maritalStatus', value: 'Casado/a', label: 'Casado/a', labelEn: 'Married' },
      { type: 'maritalStatus', value: 'En pareja', label: 'En pareja', labelEn: 'In a relationship' },
      { type: 'maritalStatus', value: 'Divorciado/a', label: 'Divorciado/a', labelEn: 'Divorced' },
      { type: 'maritalStatus', value: 'Viudo/a', label: 'Viudo/a', labelEn: 'Widowed' },
      { type: 'role', value: 'Principal', label: 'Principal', labelEn: 'Main' },
      { type: 'role', value: 'Secundario', label: 'Secundario', labelEn: 'Secondary' },
      { type: 'role', value: 'Extra', label: 'Extra', labelEn: 'Extra' },
    ]

    let created = 0
    for (const opt of defaults) {
      const exists = await prisma.characterOption.findFirst({
        where: { type: opt.type, value: opt.value },
      })
      if (!exists) {
        await prisma.characterOption.create({
          data: { ...opt, sortOrder: created + 1, isDefault: true },
        })
        created++
      }
    }
    if (created > 0) optionsCache.clear()
    return created
  },
}
